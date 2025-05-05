"use client"

import type React from "react"

import {useState} from "react"
import {useRouter} from "next/navigation"
import Link from "next/link"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Textarea} from "@/components/ui/textarea"
import {ArrowLeft, Plus, X} from "lucide-react"
import {Header} from "@/components/header"
import {useAuth} from "@/context/auth-context";

interface Ingredient {
    id: string
    name: string
    amount: string
    unit: string
}

export default function CreateRecipePage() {
    const router = useRouter()
    const {token} = useAuth();

    const [formData, setFormData] = useState({
        RecipeName: "",
        Instructions: "",
        Ingredients: ""
    })

    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [newIngredient, setNewIngredient] = useState({
        name: "",
        amount: "",
        unit: "",
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: name === "Rating" ? Number.parseInt(value) : value,
        }))
    }

    const handleIngredientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target
        setNewIngredient((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const addIngredient = () => {
        if (newIngredient.name.trim() === "") return

        const ingredient: Ingredient = {
            id: Date.now().toString(),
            ...newIngredient,
        }

        setIngredients((prev) => [...prev, ingredient])
        setNewIngredient({name: "", amount: "", unit: ""})

        const updatedIngredientsText =
            ingredients.length === 0
                ? `${newIngredient.amount} ${newIngredient.unit} ${newIngredient.name}`
                : `${formData.Ingredients}\n${newIngredient.amount} ${newIngredient.unit} ${newIngredient.name}`

        setFormData((prev) => ({
            ...prev,
            Ingredients: updatedIngredientsText,
        }))
    }

    const removeIngredient = (id: string) => {
        const updatedIngredients = ingredients.filter((ing) => ing.id !== id)
        setIngredients(updatedIngredients)

        const updatedIngredientsText = updatedIngredients.map((ing) => `${ing.amount} ${ing.unit} ${ing.name}`).join("\n")

        setFormData((prev) => ({
            ...prev,
            Ingredients: updatedIngredientsText,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch("http://127.0.0.1:5000/recipes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                throw new Error("Failed to create recipe")
            }

            const data = await response.json()
            router.push(`/recipe/${data.recipe.RecipeID}`)
        } catch (err) {
            setError("Error creating recipe. Please try again.")
            console.error(err)
        } finally {
            setLoading(false)
        }
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
                    <h1 className="text-2xl font-bold ml-4">Create New Recipe</h1>
                </div>

                {error &&
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recipe Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="RecipeName">Recipe Name</Label>
                                <Input
                                    id="RecipeName"
                                    name="RecipeName"
                                    value={formData.RecipeName}
                                    onChange={handleChange}
                                    placeholder="Enter recipe name"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Add Ingredients</Label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="amount" className="text-xs">
                                            Amount
                                        </Label>
                                        <Input
                                            id="amount"
                                            name="amount"
                                            value={newIngredient.amount}
                                            onChange={handleIngredientChange}
                                            placeholder="2, 1/2, etc."
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="unit" className="text-xs">
                                            Unit
                                        </Label>
                                        <Input
                                            id="unit"
                                            name="unit"
                                            value={newIngredient.unit}
                                            onChange={handleIngredientChange}
                                            placeholder="cups, tbsp, etc."
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="name" className="text-xs">
                                            Ingredient
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="name"
                                                name="name"
                                                value={newIngredient.name}
                                                onChange={handleIngredientChange}
                                                placeholder="flour, sugar, etc."
                                            />
                                            <Button type="button" onClick={addIngredient} variant="outline" size="icon">
                                                <Plus className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {ingredients.length > 0 && (
                                    <div className="mt-4">
                                        <Label>Ingredients List</Label>
                                        <ul className="mt-2 border rounded-md divide-y">
                                            {ingredients.map((ingredient) => (
                                                <li key={ingredient.id}
                                                    className="flex items-center justify-between p-3">
                          <span>
                            {ingredient.amount} {ingredient.unit} {ingredient.name}
                          </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeIngredient(ingredient.id)}
                                                    >
                                                        <X className="h-4 w-4"/>
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="mt-4">
                                    <Label htmlFor="Ingredients">All Ingredients</Label>
                                    <Textarea
                                        id="Ingredients"
                                        name="Ingredients"
                                        value={formData.Ingredients}
                                        onChange={handleChange}
                                        rows={5}
                                        placeholder="You can also directly edit the ingredients here"
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">List each ingredient on a new
                                        line</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="Instructions">Instructions</Label>
                                <Textarea
                                    id="Instructions"
                                    name="Instructions"
                                    value={formData.Instructions}
                                    onChange={handleChange}
                                    rows={8}
                                    placeholder="Enter step-by-step instructions"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Provide clear, step-by-step instructions for preparing the recipe
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "Creating Recipe..." : "Create Recipe"}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </>
    )
}

