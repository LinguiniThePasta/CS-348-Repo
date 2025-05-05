"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Plus, Star } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Header } from "@/components/header"
import { RecipeStatistics } from "@/components/recipe-statistics";

interface BaseRecipe {
    RecipeID: number
    RecipeName: string
    Instructions: string
    Ingredients: string
    DateCreated: string
}

function RecipeCard({ recipe }: { recipe: BaseRecipe }) {
    const [averageRating, setAverageRating] = useState<number | null>(null);
    const [ratingLoading, setRatingLoading] = useState(true);
    const [ratingError, setRatingError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRating = async () => {
            setRatingLoading(true);
            setRatingError(null);
            try {
                const response = await fetch(`http://127.0.0.1:5000/recipes/${recipe.RecipeID}/rating`);
                if (!response.ok) {
                     const errorData = await response.json().catch(() => null);
                    throw new Error(errorData?.message || "Failed to fetch rating");
                }
                const data = await response.json();
                setAverageRating(data.average_rating);
            } catch (err: any) {
                console.error(`Error fetching rating for recipe ${recipe.RecipeID}:`, err);
                setRatingError("N/A");
                setAverageRating(0);
            } finally {
                setRatingLoading(false);
            }
        };

        fetchRating();
    }, [recipe.RecipeID]);

    return (
        <Link href={`/recipe/${recipe.RecipeID}`}>
            <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                    <CardTitle>{recipe.RecipeName}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center mb-2">
                        {ratingLoading ? (
                            <span className="text-sm text-muted-foreground">Loading rating...</span>
                        ) : (
                            <>
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <Star // Using Lucide Star for consistency, or use SVG
                                            key={i}
                                            className={`w-5 h-5 ${
                                                averageRating !== null && i < Math.round(averageRating) // Round average rating for display
                                                    ? "text-yellow-400 fill-yellow-400"
                                                    : "text-gray-300"
                                            }`}
                                            // Removed fill="currentColor" if using Lucide fill prop
                                        />
                                        /* Alternative SVG:
                                        <svg
                                            key={i}
                                            className={`w-5 h-5 ${averageRating !== null && i < Math.round(averageRating) ? "text-yellow-400" : "text-gray-300"}`}
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                        </svg>
                                        */
                                    ))}
                                </div>
                                <span className="ml-2 text-sm text-gray-500">
                                    {ratingError ? ratingError : averageRating !== null ? `(${averageRating.toFixed(1)}/5)` : '(N/A)'}
                                </span>
                            </>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Created: {new Date(recipe.DateCreated).toLocaleDateString()}
                    </p>
                </CardContent>
            </Card>
        </Link>
    );
}


export default function Home() {
    const [recipes, setRecipes] = useState<BaseRecipe[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [minRating, setMinRating] = useState<number | "">("")
    const [startDate, setStartDate] = useState<Date | undefined>(undefined)
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)

    useEffect(() => {
        fetchRecipes()
    }, [])

    const fetchRecipes = async (isFilter = false) => {
        setLoading(true);
        setError(null); // Clear previous errors
        let url = "http://127.0.0.1:5000/recipes";
        let options: RequestInit = { method: "GET" };

        if (isFilter) {
            console.log(minRating);
            url = "http://127.0.0.1:5000/filter_recipes";
            options = {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    min_rating: minRating === "" ? undefined : minRating,
                    start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
                    end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
                }),
            };
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `Failed to fetch ${isFilter ? 'filtered ' : ''}recipes`);
            }
            const data = await response.json();
             // Ensure the backend returns 'recipes' key in both cases
            setRecipes(data.recipes || []);
        } catch (err: any) {
            setError(`Error ${isFilter ? 'filtering' : 'loading'} recipes. Please try again.`);
            console.error(err);
            setRecipes([]); // Clear recipes on error
        } finally {
            setLoading(false);
        }
    }

    // Trigger filter fetch
    const applyFilters = () => {
        fetchRecipes(true); // Pass true to indicate filtering
    }

    // Reset filters and fetch all recipes
    const resetFilters = () => {
        setMinRating("")
        setStartDate(undefined)
        setEndDate(undefined)
        fetchRecipes(false); // Pass false to fetch all
    }

    return (
        <>
            <Header/>
            <main className="container mx-auto py-8 px-4">
                {/* Header and Create Button */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h1 className="text-3xl font-bold">Recipe Collection</h1>
                    {/* Link to create page - ensure this route exists */}
                    <Link href="/recipe/new">
                        <Button size="lg" className="gap-2">
                            <Plus className="h-5 w-5"/>
                            Create New Recipe
                        </Button>
                    </Link>
                </div>

                {/* Statistics Component */}
                 <div className="mb-8">
                    {/* Pass filter state to statistics component if needed */}
                    <RecipeStatistics minRating={minRating} startDate={startDate} endDate={endDate} />
                </div>

                {/* Filter Card */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Filter Recipes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Min Rating Input */}
                            <div className="space-y-2">
                                <Label htmlFor="min-rating">Minimum Avg. Rating</Label>
                                <Input
                                    id="min-rating"
                                    type="number"
                                    min="0"
                                    max="5"
                                    step="0.1" // Allow decimals for average rating filter
                                    value={minRating}
                                    onChange={(e) => setMinRating(e.target.value === "" ? "" : Number(e.target.value))}
                                    placeholder="e.g., 3.5"
                                />
                            </div>
                            {/* Start Date Picker */}
                            <div className="space-y-2">
                                <Label>Start Date (Created)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !startDate && "text-muted-foreground",
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4"/>
                                            {startDate ? format(startDate, "PPP") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={startDate} onSelect={setStartDate}
                                                  initialFocus/>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            {/* End Date Picker */}
                            <div className="space-y-2">
                                <Label>End Date (Created)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4"/>
                                            {endDate ? format(endDate, "PPP") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus/>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={resetFilters}>
                            Reset
                        </Button>
                        <Button onClick={applyFilters} disabled={loading}>
                            {loading ? 'Filtering...' : 'Apply Filters'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Error Display */}
                {error &&
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

                {/* Recipe Grid */}
                {loading && recipes.length === 0 ? ( // Show loading only if recipes aren't already displayed
                    <div className="text-center py-8">Loading recipes...</div>
                ) : !loading && recipes.length === 0 ? ( // Show no results message only when not loading
                    <div className="text-center py-12">
                        <p className="text-muted-foreground mb-6">
                            No recipes found matching your criteria. Try adjusting filters or add a new recipe.
                        </p>
                        <Link href="/recipe/new">
                            <Button size="lg" className="gap-2">
                                <Plus className="h-5 w-5"/>
                                Create Recipe
                            </Button>
                        </Link>
                    </div>
                ) : (
                    // Render recipe cards using the new component
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recipes.map((recipe) => (
                            <RecipeCard key={recipe.RecipeID} recipe={recipe} />
                        ))}
                    </div>
                )}

                {/* Floating Action Button - Link to create page */}
                <div className="fixed bottom-6 right-6">
                    <Link href="/recipe/new">
                        <Button size="lg" className="rounded-full h-14 w-14 p-0 shadow-lg">
                            <Plus className="h-6 w-6"/>
                            <span className="sr-only">Create Recipe</span>
                        </Button>
                    </Link>
                </div>

            </main>
        </>
    )
}

