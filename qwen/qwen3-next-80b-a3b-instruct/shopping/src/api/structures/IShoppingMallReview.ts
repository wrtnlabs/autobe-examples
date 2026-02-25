import { tags } from "typia";

export namespace IShoppingMallReview {
  /**
   * Search criteria for querying product reviews with filters for product, reviewer, rating, and date range. Includes pagination and sort control for efficient UI rendering.
   */
  export type IRequest = {
    /**
     * The unique identifier of the product for which reviews are being queried.
     *
     * @x-autobe-database-schema-property product_id
     * @x-autobe-specification Direct mapping from shopping_mall_reviews.product_id. Used to filter reviews belonging to a specific product.
     */
    product_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * The unique identifier of the customer whose reviews are being queried.
     *
     * @x-autobe-database-schema-property customer_id
     * @x-autobe-specification Direct mapping from shopping_mall_reviews.customer_id. Used to filter reviews written by a specific customer.
     */
    customer_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * The range of star ratings (1-5) to filter reviews by, with minimum and maximum values.
     *
     * @x-autobe-database-schema-property rating
     * @x-autobe-specification Maps rating_range.min and rating_range.max to filtering condition on shopping_mall_reviews.rating between min and max values. Validates range is within 1-5 per requirements in 10-reviews-ratings.md.
     */
    rating_range?:
      | {
          min: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>;
          max: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>;
        }
      | undefined;

    /**
     * The date range to filter reviews by creation date, with start and end timestamps in ISO 8601 format.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Maps created_at_range.start and created_at_range.end to filtering condition on shopping_mall_reviews.created_at between start and end timestamps. Uses ISO 8601 format per database schema.
     */
    created_at_range?:
      | {
          start: string & tags.Format<"date-time">;
          end: string & tags.Format<"date-time">;
        }
      | undefined;

    /**
     * The sort direction for reviews: 'newest' (most recent first) or 'oldest' (earliest first).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Sorts results by shopping_mall_reviews.created_at in ascending (oldest) or descending (newest) order based on value. Used for UI display order control.
     */
    sort?: "newest" | "oldest" | undefined;

    /**
     * The page number of results to retrieve, starting from 1.
     *
     * @x-autobe-specification Pagination control that determines the page number of results to return. Calculated as: offset = (page - 1) * limit. Starts at 1. Max page is determined by total records / limit.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * The maximum number of reviews to return per page, capped at 100.
     *
     * @x-autobe-specification Pagination control that sets maximum number of reviews returned per page. Cap of 100 per 10-reviews-ratings.md. Used to calculate offset = (page - 1) * limit.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Lightweight summary of a product review for display in list views. Includes critical metadata such as rating, content, and timestamps while excluding personal identifiers (customer, product) and administrative fields for privacy and efficiency. Used in paginated review listings where the main intent is to show review quality and status without exposing sensitive relationship data.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property rating
     */
    rating: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>;

    /**
     * Optional textual feedback provided by the customer.
     *
     * @x-autobe-database-schema-property content
     * @x-autobe-specification Direct mapping from shopping_mall_reviews.content; nullable since users may submit reviews without content.
     */
    content?: string | null | undefined;
    /**
     * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;
    /**
     * @x-autobe-database-schema-property updated_at
     */
    updated_at: string & tags.Format<"date-time">;
    /**
     * @x-autobe-database-schema-property is_deleted
     */
    is_deleted: boolean;
  };
}
