"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/header';
import RecipeForm from '@/components/recipe-form';
import type { Recipe } from '@/path/to/your/recipe/interface';

export default function EditRecipePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const recipeId = params.id;

    useEffect(() => {
        const fetchRecipeForEdit = async () => {
            const numericRecipeId = Number.parseInt(recipeId);
            if (isNaN(numericRecipeId)) {
                setError("Invalid recipe ID.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`http://127.0.0.1:5000/recipes/${numericRecipeId}`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || "Failed to fetch recipe for editing");
                }
                const data = await response.json();
                if (!data.recipe) {
                     throw new Error("Recipe data not found in response.");
                }
                setRecipe(data.recipe);
            } catch (err: any) {
                setError(err.message || "Error loading recipe data.");
                console.error(err);
                setRecipe(null);
            } finally {
                setLoading(false);
            }
        };

        fetchRecipeForEdit();
    }, [recipeId]);

    if (loading) {
        return (
             <>
                 <Header />
                 <div className="container mx-auto py-8 px-4 text-center">Loading recipe data...</div>
             </>
         );
    }

    if (error || !recipe) {
        return (
             <>
                <Header/>
                <div className="container mx-auto py-8 px-4">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error || "Recipe not found or could not be loaded."}
                    </div>
                    <Link href={recipeId && !isNaN(Number(recipeId)) ? `/recipe/${recipeId}` : "/recipe"}>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4"/>
                            Back
                        </Button>
                    </Link>
                </div>
             </>
        );
    }

    return <RecipeForm recipe={recipe} />;
}