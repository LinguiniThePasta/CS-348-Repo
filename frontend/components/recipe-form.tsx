"use client";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-context";

interface Recipe {
    RecipeID: number;
    RecipeName: string;
    Instructions: string;
    Ingredients: string;
    DateCreated: string;
    Rating: number;
    UserID: number;
}

export default function RecipeForm({ recipe }: { recipe?: Recipe }) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        RecipeName: recipe?.RecipeName || "",
        Instructions: recipe?.Instructions || "",
        Ingredients: recipe?.Ingredients || "",
        Rating: recipe?.Rating || 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuth();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "Rating" ? (value === '' ? 0 : Number(value)) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!token) {
            setError("You must be logged in to save recipes.");
            setLoading(false);
            return;
        }

        try {
            const API_BASE_URL = "http://127.0.0.1:5000";
            const url = recipe
                ? `${API_BASE_URL}/recipes/${recipe.RecipeID}`
                : `${API_BASE_URL}/recipes`;
            const method = recipe ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: `Failed to ${recipe ? "update" : "create"} recipe` }));
                throw new Error(errorData.message || `Failed to ${recipe ? "update" : "create"} recipe`);
            }

            const data = await response.json();
            if (!data.recipe || !data.recipe.RecipeID) {
                throw new Error("API response did not include the expected recipe ID.")
            }
            router.push(`/recipe/${data.recipe.RecipeID}`);
        } catch (err: any) {
            setError(err.message || `Error ${recipe ? "updating" : "creating"} recipe. Please try again.`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header />
            <div className="container mx-auto py-8 px-4">
                <div className="flex items-center mb-6">
                    <Link href={recipe ? `/recipe/${recipe.RecipeID}` : "/recipe"}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold ml-4">{recipe ? "Edit Recipe" : "Create New Recipe"}</h1>
                </div>

                {error &&
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="RecipeName">Recipe Name</Label>
                                <Input id="RecipeName" name="RecipeName" value={formData.RecipeName}
                                       onChange={handleChange} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="Ingredients">Ingredients</Label>
                                <Textarea
                                    id="Ingredients"
                                    name="Ingredients"
                                    value={formData.Ingredients}
                                    onChange={handleChange}
                                    required
                                    rows={5}
                                    placeholder="Enter ingredients, one per line"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="Instructions">Instructions</Label>
                                <Textarea
                                    id="Instructions"
                                    name="Instructions"
                                    value={formData.Instructions}
                                    onChange={handleChange}
                                    required
                                    rows={8}
                                    placeholder="Enter step-by-step instructions"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="Rating">Average Rating (Informational)</Label>
                                <Input
                                    id="Rating"
                                    name="Rating"
                                    type="number"
                                    step="0.1"
                                    value={formData.Rating}
                                    onChange={handleChange}
                                    disabled
                                />
                                <p className="text-sm text-muted-foreground">Average rating is calculated automatically. Use the star rating below the recipe details to submit your own rating.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col items-stretch">
                             <Button type="submit" disabled={loading || !token} className="w-full">
                                {loading ? "Saving..." : recipe ? "Update Recipe" : "Create Recipe"}
                            </Button>
                             {!token && (
                                <p className="text-center text-sm text-red-600 pt-4">
                                    You must be logged in to save changes.
                                </p>
                            )}
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </>
    );
}

