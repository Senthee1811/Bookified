'use client';

import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, ImageIcon } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { upload } from '@vercel/blob/client';

import { UploadSchema } from '@/lib/zod';
import { BookUploadFormValues } from '@/types';
import {
    ACCEPTED_PDF_TYPES,
    ACCEPTED_IMAGE_TYPES,
} from '@/lib/constants';

import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
} from '@/components/ui/field';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import FileUploader from './FileUploader';
import VoiceSelector from './VoiceSelector';
import LoadingOverlay from './LoadingOverlay';

import {
    checkBookExists,
    createBook,
    saveBookSegments,
} from '@/lib/actions/book.actions';

import { parsePDFFile } from '@/lib/utils';


const UploadForm = () => {

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const { userId } = useAuth();
    const router = useRouter();


    useEffect(() => {
        setIsMounted(true);
    }, []);


    const form = useForm<BookUploadFormValues>({
        resolver: zodResolver(UploadSchema),
        defaultValues: {
            title: '',
            author: '',
            persona: '',
            pdfFile: undefined,
            coverImage: undefined,
        },
    });



    const onSubmit = async (data: BookUploadFormValues) => {

        if (!userId) {
            return toast.error("Please login to upload books");
        }


        setIsSubmitting(true);


        try {

            const existsCheck = await checkBookExists(data.title);


            if (existsCheck.exists && existsCheck.book) {

                toast.info("Book with same title already exists.");

                form.reset();

                router.push(`/books/${existsCheck.book.slug}`);

                return;
            }



            const fileTitle =
                data.title
                    .replace(/\s+/g, '-')
                    .toLowerCase();


            const pdfFile = data.pdfFile;


            const parsedPDF = await parsePDFFile(pdfFile);



            if (parsedPDF.content.length === 0) {

                toast.error(
                    "Failed to parse PDF. Please try again with a different file."
                );

                return;
            }



            const uploadedPdfBlob = await upload(
                fileTitle,
                pdfFile,
                {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                    contentType: 'application/pdf'
                }
            );



            let coverUrl: string;



            if (data.coverImage) {

                const coverFile = data.coverImage;


                const uploadedCoverBlob = await upload(
                    `${fileTitle}_cover.png`,
                    coverFile,
                    {
                        access: 'public',
                        handleUploadUrl: '/api/upload',
                        contentType: coverFile.type
                    }
                );


                coverUrl = uploadedCoverBlob.url;


            } else {


                const response = await fetch(parsedPDF.cover);

                const blob = await response.blob();



                const uploadedCoverBlob = await upload(
                    `${fileTitle}_cover.png`,
                    blob,
                    {
                        access: 'public',
                        handleUploadUrl: '/api/upload',
                        contentType: 'image/png'
                    }
                );


                coverUrl = uploadedCoverBlob.url;
            }



            const book = await createBook({

                clerkId: userId,
                title: data.title,
                author: data.author,
                persona: data.persona,

                fileURL: uploadedPdfBlob.url,
                fileBlobKey: uploadedPdfBlob.pathname,

                coverURL: coverUrl,

                fileSize: pdfFile.size,
            });



            if (!book.success) {

                toast.error(
                    book.error as string ||
                    "Failed to create book"
                );


                if (book.isBillingError) {
                    router.push("/subscriptions");
                }


                return;
            }



            if (book.alreadyExists) {

                toast.info(
                    "Book with same title already exists."
                );


                form.reset();


                router.push(
                    `/books/${book.data.slug}`
                );


                return;
            }



            const segments = await saveBookSegments(
                book.data._id,
                userId,
                parsedPDF.content
            );



            if (!segments.success) {

                toast.error(
                    "Failed to save book segments"
                );

                throw new Error(
                    "Failed to save book segments"
                );
            }



            form.reset();

            router.push('/');



        } catch (error) {

            console.error(error);

            toast.error(
                "Failed to upload book. Please try again later."
            );


        } finally {

            setIsSubmitting(false);

        }

    };



    if (!isMounted) return null;



    return (
        <>

            {isSubmitting && <LoadingOverlay />}



            <div className="new-book-wrapper">

                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-8"
                >



                    <FileUploader

                        control={form.control}

                        name="pdfFile"

                        label="Book PDF File"

                        acceptTypes={ACCEPTED_PDF_TYPES}

                        icon={Upload}

                        placeholder="Click to upload PDF"

                        hint="PDF file (max 50MB)"

                        disabled={isSubmitting}

                    />





                    <FileUploader

                        control={form.control}

                        name="coverImage"

                        label="Cover Image (Optional)"

                        acceptTypes={ACCEPTED_IMAGE_TYPES}

                        icon={ImageIcon}

                        placeholder="Click to upload cover image"

                        hint="Leave empty to auto-generate from PDF"

                        disabled={isSubmitting}

                    />






                    <Controller

                        name="title"

                        control={form.control}

                        render={({field, fieldState}) => (

                            <Field
                                data-invalid={fieldState.invalid}
                            >

                                <FieldLabel htmlFor="title">
                                    Title
                                </FieldLabel>


                                <Input

                                    {...field}

                                    id="title"

                                    placeholder="ex: Rich Dad Poor Dad"

                                    disabled={isSubmitting}

                                    aria-invalid={
                                        fieldState.invalid
                                    }

                                />



                                <FieldDescription>
                                    Enter the book title.
                                </FieldDescription>



                                {fieldState.invalid && (

                                    <FieldError
                                        errors={[
                                            fieldState.error
                                        ]}
                                    />

                                )}


                            </Field>

                        )}

                    />






                    <Controller

                        name="author"

                        control={form.control}

                        render={({field, fieldState}) => (

                            <Field
                                data-invalid={fieldState.invalid}
                            >

                                <FieldLabel htmlFor="author">
                                    Author Name
                                </FieldLabel>



                                <Input

                                    {...field}

                                    id="author"

                                    placeholder="ex: Robert Kiyosaki"

                                    disabled={isSubmitting}

                                    aria-invalid={
                                        fieldState.invalid
                                    }

                                />



                                {fieldState.invalid && (

                                    <FieldError
                                        errors={[
                                            fieldState.error
                                        ]}
                                    />

                                )}


                            </Field>

                        )}

                    />






                    <Controller

                        name="persona"

                        control={form.control}

                        render={({field, fieldState}) => (

                            <Field
                                data-invalid={fieldState.invalid}
                            >

                                <FieldLabel>
                                    Choose Assistant Voice
                                </FieldLabel>



                                <VoiceSelector

                                    value={field.value}

                                    onChange={field.onChange}

                                    disabled={isSubmitting}

                                />



                                {fieldState.invalid && (

                                    <FieldError
                                        errors={[
                                            fieldState.error
                                        ]}
                                    />

                                )}


                            </Field>

                        )}

                    />






                    <Button

                        type="submit"

                        className="form-btn"

                        disabled={isSubmitting}

                    >

                        {isSubmitting
                            ? "Synthesizing..."
                            : "Begin Synthesis"
                        }

                    </Button>



                </form>


            </div>


        </>
    );
};


export default UploadForm;