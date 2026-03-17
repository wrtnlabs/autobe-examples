import { tags } from "typia";

export namespace IEcommerceMallProductReviewStat {
  /**
   * Request parameters for filtering review statistics by verified purchase status, rating range, and date range. These optional filters allow calculating aggregated metrics for specific subsets of product reviews.
   */
  export type IRequest = {
    /**
     * Filter to include only verified or unverified reviews in the statistics.
     *
     * @x-autobe-specification Boolean filter for verified purchase status. If true, includes only reviews where is_verified_purchase IS TRUE. If false, includes only reviews where is_verified_purchase IS FALSE or IS NULL.
     */
    is_verified_purchase?: boolean | undefined;

    /**
     * Minimum rating threshold (1-5) for filtering reviews.
     *
     * @x-autobe-specification Minimum rating value for filtering reviews. Range: 1-5. Reviews with rating >= rating_min are included.
     */
    rating_min?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>)
      | undefined;

    /**
     * Maximum rating threshold (1-5) for filtering reviews.
     *
     * @x-autobe-specification Maximum rating value for filtering reviews. Range: 1-5. Reviews with rating <= rating_max are included.
     */
    rating_max?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>)
      | undefined;

    /**
     * Filter reviews created after this date-time.
     *
     * @x-autobe-specification Date-time filter for reviews created after this timestamp. ISO 8601 format. Reviews with created_at > created_at_after are included.
     */
    created_at_after?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter reviews created before this date-time.
     *
     * @x-autobe-specification Date-time filter for reviews created before this timestamp. ISO 8601 format. Reviews with created_at < created_at_before are included.
     */
    created_at_before?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Target page number to retrieve (1-indexed).
     *
     * @x-autobe-specification 1-indexed page number for pagination. Defaults to 1 if not provided.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * @x-autobe-specification Maximum records to return per page. Defaults to 100 if not provided.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Aggregated review statistics for a product. Contains computed metrics including average rating (weighted mean of 1-5 star ratings), total review count, rating distribution across all star levels (1-5 stars), verified purchase breakdown, and the date range spanning from the oldest to newest review. All metrics are calculated from active reviews (excluding soft-deleted) for the specified product.
   */
  export type ISummary = {
    /**
     * The average rating across all active reviews for this product, expressed as a decimal number between 0.0 and 5.0. Returns null if no reviews exist.
     *
     * @x-autobe-specification Calculated as AVG(rating) from ecommerce_mall_reviews WHERE product_id = ? AND deleted_at IS NULL. Returns NULL when no reviews exist. Value range: 0.0 to 5.0 (or NULL).
     */
    averageRating: number;

    /**
     * The total number of active reviews for this product.
     *
     * @x-autobe-specification Calculated as COUNT(*) from ecommerce_mall_reviews WHERE product_id = ? AND deleted_at IS NULL. Returns 0 when no reviews exist.
     */
    totalCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Breakdown of review counts by star rating (1-5 stars). An object with keys '1', '2', '3', '4', '5' where each value represents the number of reviews receiving that specific star rating.
     *
     * @x-autobe-specification Calculated as GROUP BY rating with COUNT(*) from ecommerce_mall_reviews WHERE product_id = ? AND deleted_at IS NULL. Returns an object with exactly 5 keys ('1', '2', '3', '4', '5'), each containing the count of reviews at that rating level. All keys must be present even if count is 0.
     */
    ratingDistribution: {
      [key: string]: number & tags.Type<"int32"> & tags.Minimum<0>;
    };

    /**
     * The number of reviews from verified purchases, where customers have confirmed they purchased the product.
     *
     * @x-autobe-specification Calculated as COUNT(*) WHERE is_verified_purchase = TRUE from ecommerce_mall_reviews WHERE product_id = ? AND deleted_at IS NULL. Returns 0 when no verified purchase reviews exist.
     */
    verifiedPurchaseCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * The number of reviews from unverified purchases or reviews where purchase verification status is unknown.
     *
     * @x-autobe-specification Calculated as COUNT(*) WHERE is_verified_purchase = FALSE OR is_verified_purchase IS NULL from ecommerce_mall_reviews WHERE product_id = ? AND deleted_at IS NULL. Returns 0 when no unverified purchase reviews exist.
     */
    unverifiedPurchaseCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * The date and time of the oldest (earliest) review for this product. Returns null if no reviews exist.
     *
     * @x-autobe-specification Calculated as MIN(created_at) from ecommerce_mall_reviews WHERE product_id = ? AND deleted_at IS NULL. Returns null when no reviews exist. ISO 8601 date-time format.
     */
    oldestReviewAt: (string & tags.Format<"date-time">) | null;

    /**
     * The date and time of the newest (most recent) review for this product. Returns null if no reviews exist.
     *
     * @x-autobe-specification Calculated as MAX(created_at) from ecommerce_mall_reviews WHERE product_id = ? AND deleted_at IS NULL. Returns null when no reviews exist. ISO 8601 date-time format.
     */
    newestReviewAt: (string & tags.Format<"date-time">) | null;
  };
}
