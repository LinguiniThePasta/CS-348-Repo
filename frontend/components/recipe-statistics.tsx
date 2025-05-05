"use client"

import {useEffect, useState} from "react"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {BarChart, Calendar, Star} from "lucide-react"
import {format} from "date-fns"

interface AverageRatingResponse {
    average_rating: number
}

interface MaxRecipesPerDayResponse {
    day: string
    count: number
}

interface RecipeStatisticsProps {
    minRating: number | ""
    startDate: Date | undefined
    endDate: Date | undefined
}

export function RecipeStatistics({minRating, startDate, endDate}: RecipeStatisticsProps) {
    const [averageRating, setAverageRating] = useState<number | null>(null)
    const [mostActiveDay, setMostActiveDay] = useState<{ day: string; count: number } | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchStatistics = async () => {
            setLoading(true)
            setError(null)

            try {
                const filters: Record<string, any> = {}

                if (minRating !== "") {
                    filters.min_rating = minRating
                }

                if (startDate) {
                    filters.start_date = format(startDate, "yyyy-MM-dd")
                }

                if (endDate) {
                    filters.end_date = format(endDate, "yyyy-MM-dd")
                }

                const ratingResponse = await fetch("http://127.0.0.1:5000/recipes/average_rating_report", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(filters),
                })

                if (!ratingResponse.ok) {
                    throw new Error("Failed to fetch average rating")
                }

                const ratingData: AverageRatingResponse = await ratingResponse.json()
                setAverageRating(ratingData.average_rating)

                const dayResponse = await fetch("http://127.0.0.1:5000/recipes/max_recipes_per_day_report", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(filters),
                })

                if (!dayResponse.ok) {
                    throw new Error("Failed to fetch most active day")
                }

                const dayData: MaxRecipesPerDayResponse = await dayResponse.json()
                setMostActiveDay(dayData)
            } catch (err) {
                console.error("Error fetching statistics:", err)
                setError("Failed to load statistics")
            } finally {
                setLoading(false)
            }
        }

        fetchStatistics()
    }, [minRating, startDate, endDate])

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <BarChart className="mr-2 h-5 w-5"/>
                        Recipe Statistics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-24 flex items-center justify-center">
                        <p className="text-muted-foreground">Loading statistics...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <BarChart className="mr-2 h-5 w-5"/>
                        Recipe Statistics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-24 flex items-center justify-center">
                        <p className="text-muted-foreground">{error}</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <BarChart className="mr-2 h-5 w-5"/>
                    Recipe Statistics
                    {(minRating !== "" || startDate || endDate) && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">(Filtered)</span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                        <div className="flex items-center mb-2">
                            <Star className="h-5 w-5 text-yellow-400 mr-2"/>
                            <h3 className="text-lg font-medium">Average Rating</h3>
                        </div>
                        {averageRating !== null ? (
                            <>
                                <p className="text-3xl font-bold">{averageRating.toFixed(1)}</p>
                                <p className="text-sm text-muted-foreground mt-1">out of 5.0</p>
                            </>
                        ) : (
                            <p className="text-muted-foreground">No data available</p>
                        )}
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                        <div className="flex items-center mb-2">
                            <Calendar className="h-5 w-5 text-primary mr-2"/>
                            <h3 className="text-lg font-medium">Most Active Day</h3>
                        </div>
                        {mostActiveDay ? (
                            <>
                                <p className="text-3xl font-bold">{mostActiveDay.day}</p>
                                <p className="text-sm text-muted-foreground mt-1">{mostActiveDay.count} recipes
                                    created</p>
                            </>
                        ) : (
                            <p className="text-muted-foreground">No data available</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

