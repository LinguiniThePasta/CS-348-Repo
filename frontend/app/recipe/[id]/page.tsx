"use client";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash, Star } from "lucide-react";
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-context";

interface Recipe {
    RecipeID: number;
    RecipeName: string;
    Instructions: string;
    Ingredients: string;
    DateCreated: string;
    UserID: number;
}

function RatingCard({ recipeId, token, onRatingSuccess }: { recipeId: number; token: string | null; onRatingSuccess?: () => void }) {
    const [selectedRating, setSelectedRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);


    const handleRatingSubmit = async () => {
        if (selectedRating === 0 || !token) {
            setErrorMessage(token ? "Please select a rating." : "You must be logged in to rate.");
            setSubmitStatus('error');
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus('idle');
        setErrorMessage(null);

        try {
            const response = await fetch(`http://127.0.0.1:5000/rate_recipe/${recipeId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ rating: selectedRating })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Failed to submit rating" }));
                throw new Error(errorData.message || "Failed to submit rating");
            }

            setSubmitStatus('success');
            onRatingSuccess?.();

        } catch (err: any) {
            setSubmitStatus('error');
            setErrorMessage(err.message || "An error occurred. Please try again.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Rate this Recipe</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
                <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => {
                        const ratingValue = i + 1;
                        return (
                            <button
                                key={ratingValue}
                                type="button"
                                onMouseEnter={() => setHoverRating(ratingValue)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setSelectedRating(ratingValue)}
                                className="focus:outline-none"
                                disabled={!isMounted || isSubmitting || submitStatus === 'success'}
                            >
                                <Star
                                    className={`w-8 h-8 cursor-pointer transition-colors ${
                                        ratingValue <= (hoverRating || selectedRating)
                                            ? "text-yellow-400 fill-yellow-400"
                                            : "text-gray-300"
                                    }`}
                                />
                            </button>
                        );
                    })}
                </div>
                {submitStatus === 'success' && (
                    <p className="text-green-600">Thank you for your rating!</p>
                )}
                 {submitStatus === 'error' && errorMessage && (
                    <p className="text-red-600">{errorMessage}</p>
                )}
            </CardContent>
            <CardFooter className="flex flex-col items-stretch">
                 <Button
                    onClick={handleRatingSubmit}
                    disabled={!isMounted || isSubmitting || selectedRating === 0 || submitStatus === 'success' || !token}
                 >
                    {isSubmitting ? "Submitting..." : "Submit Rating"}
                 </Button>
                 {!token && isMounted && (
                     <p className="text-center text-sm text-muted-foreground pt-4">
                         Please <Link href="/login" className="underline">log in</Link> to rate this recipe.
                     </p>
                 )}
            </CardFooter>
        </Card>
    );
}


export default function RecipeDetail({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { token } = useAuth();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [recipeLoading, setRecipeLoading] = useState(true);
    const [recipeError, setRecipeError] = useState<string | null>(null);

    const [averageRating, setAverageRating] = useState<number | null>(null);
    const [ratingLoading, setRatingLoading] = useState(true);
    const [ratingError, setRatingError] = useState<string | null>(null);

    const recipeId = params.id;
    const [isMounted, setIsMounted] = useState(false);
    const [numericRecipeId, setNumericRecipeId] = useState<number | null>(null);


    useEffect(() => {
        setIsMounted(true);
        const numId = Number.parseInt(recipeId);
        if (!isNaN(numId)) {
            setNumericRecipeId(numId);
        } else {
            setRecipeError("Invalid recipe ID format.");
            setRecipeLoading(false);
            setRatingLoading(false);
        }
    }, [recipeId]);


    useEffect(() => {
         if (!numericRecipeId) return;

         const fetchRecipe = async () => {
            setRecipeLoading(true);
            setRecipeError(null);
            try {
                const response = await fetch(`http://127.0.0.1:5000/recipes/${numericRecipeId}`, { cache: 'no-store' });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || "Failed to fetch recipe");
                }
                const data = await response.json();
                 if (!data.recipe) {
                     throw new Error("Recipe data not found in response.");
                 }
                setRecipe(data.recipe);
            } catch (err: any) {
                setRecipeError(err.message || "Error loading recipe details. Please try again.");
                console.error("Recipe fetch error:", err);
                setRecipe(null);
            } finally {
                setRecipeLoading(false);
            }
        };

        fetchRecipe();
    }, [numericRecipeId]);

     useEffect(() => {
         if (!numericRecipeId) return;

         const fetchRating = async () => {
             setRatingLoading(true);
             setRatingError(null);
             setAverageRating(null);

             const ratingUrl = `http://127.0.0.1:5000/recipes/${numericRecipeId}/rating`;

             try {
                 const response = await fetch(ratingUrl, { cache: 'no-store' });
                 if (!response.ok) {
                     const errorData = await response.json().catch(() => null);
                     throw new Error(errorData?.message || "Failed to fetch rating");
                 }
                 const data = await response.json();
                 if (typeof data.average_rating === 'number') {
                     setAverageRating(data.average_rating);
                 } else {
                     console.warn(`Invalid average_rating received for recipe ${numericRecipeId}:`, data.average_rating);
                     setAverageRating(0);
                     setRatingError("Invalid Data");
                 }
             } catch (err: any) {
                 console.error(`Error fetching rating for recipe ${numericRecipeId}:`, err);
                 setRatingError("N/A");
                 setAverageRating(0);
             } finally {
                 setRatingLoading(false);
             }
         };

         fetchRating();
     }, [numericRecipeId]);


      const refetchAverageRating = async () => {
         if (!numericRecipeId) return;
         setRatingLoading(true);
         setRatingError(null);
         const ratingUrl = `http://127.0.0.1:5000/recipes/${numericRecipeId}/rating`;
         try {
            const response = await fetch(ratingUrl, { cache: 'no-store' });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => null);
                 throw new Error(errorData?.message || "Failed to fetch rating");
            }
            const data = await response.json();
             if (typeof data.average_rating === 'number') {
                 setAverageRating(data.average_rating);
             } else {
                 console.warn(`Invalid average_rating received for recipe ${numericRecipeId}:`, data.average_rating);
                 setAverageRating(0);
                 setRatingError("Invalid Data");
             }
         } catch (err: any) {
            console.error(`Error refetching rating for recipe ${numericRecipeId}:`, err);
            setRatingError("N/A");
            setAverageRating(0);
         } finally {
            setRatingLoading(false);
         }
     };


     const handleDelete = async () => {
        if (!recipe) return;

        const currentRecipeId = recipe.RecipeID;

        setRecipeError(null);
        try {
            const response = await fetch(`http://127.0.0.1:5000/recipes/${currentRecipeId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to delete recipe");
            }

            router.push("/recipe/");
        } catch (err: any) {
            setRecipeError(err.message || "Error deleting recipe. Please try again.");
            console.error("Delete error:", err);
        }
    };

     if (recipeLoading || !numericRecipeId && recipeError === null) {
         return (
             <>
                 <Header />
                 <div className="container mx-auto py-8 px-4 text-center">Loading recipe...</div>
             </>
         );
    }

    if (recipeError || !recipe) {
        return (
            <>
                <Header/>
                <div className="container mx-auto py-8 px-4">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {recipeError || "Recipe not found"}
                    </div>
                    <Link href="/recipe">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4"/>
                            Back to Recipes
                        </Button>
                    </Link>
                </div>
            </>
        );
    }

    return (
        <>
            <Header/>
            <div className="container mx-auto py-8 px-4">
                <div className="flex items-center mb-6">
                    <Link href="/recipe">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4"/>
                            Back
                        </Button>
                    </Link>
                    <div className="ml-auto flex gap-2">
                        {/* Ensure recipe exists before creating edit link */}
                        <Link href={`/recipe/${recipe.RecipeID}/edit`}>
                            <Button variant="outline" size="sm">
                                <Edit className="mr-2 h-4 w-4"/>
                                Edit
                            </Button>
                        </Link>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={!isMounted || !token}>
                                    <Trash className="mr-2 h-4 w-4"/>
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the recipe.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{recipe.RecipeName}</CardTitle>
                        <div className="flex items-center mt-2">
                             {ratingLoading ? (
                                <span className="text-sm text-muted-foreground">Loading rating...</span>
                             ) : (
                                <>
                                    <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`w-5 h-5 ${
                                                    averageRating !== null && i < Math.round(averageRating)
                                                        ? "text-yellow-400 fill-yellow-400"
                                                        : "text-gray-300"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <span className="ml-2 text-sm text-gray-500">
                                        {ratingError ? ratingError : averageRating !== null ? `(${averageRating.toFixed(1)}/5 average)` : '(N/A)'}
                                    </span>
                                </>
                             )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Created: {isMounted && recipe.DateCreated ? new Date(recipe.DateCreated).toLocaleDateString() : '...'}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Ingredients</h3>
                            <div className="whitespace-pre-line">{recipe.Ingredients}</div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Instructions</h3>
                            <div className="whitespace-pre-line">{recipe.Instructions}</div>
                        </div>
                    </CardContent>
                </Card>

                {numericRecipeId && (
                     <RatingCard
                         recipeId={numericRecipeId}
                         token={token}
                         onRatingSuccess={refetchAverageRating}
                     />
                )}

            </div>
        </>
    );
}