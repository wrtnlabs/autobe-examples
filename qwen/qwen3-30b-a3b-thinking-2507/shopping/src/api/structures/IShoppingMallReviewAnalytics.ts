import { tags } from "typia";

export namespace IShoppingMallReviewAnalytics {
  /**
   * Summary analytics for product reviews, containing statistical metrics for
   * aggregated review data. Designed for use in the admin dashboard where it
   * provides an overview of product performance based on customer feedback.
   * This data structure is optimized for efficient analytics and reporting in
   * shopping mall management, supporting business intelligence needs in
   * retail operations.
   */
  export type ISummary = {
    /**
     * Product identifier associated with these review analytics. Correlates
     * to the `product_id` field in `shopping_mall_reviews` table.
     * Represents the specific product for which review statistics are
     * aggregated. This is a foreign key reference to the
     * `shopping_mall_products` entity.
     */
    product_id: string & tags.Format<"uuid">;

    /**
     * Average rating derived from all reviews for the product. Computed
     * using `AVG(rating)` function on `shopping_mall_reviews.rating` field.
     * Represents the mean customer satisfaction score, typically ranging
     * from 1.0 to 5.0. This metric is critical for product performance
     * analysis and ranking.
     */
    avg_rating: number;

    /**
     * Number of reviews associated with the product. Computed using
     * `COUNT(*)` on the `shopping_mall_reviews` table. Indicates product
     * review volume which influences both visibility and credibility. A
     * higher count often correlates with better product acceptance, though
     * it's not a direct purchase indicator.
     */
    review_count: number & tags.Type<"int32">;

    /**
     * Average helpfulness rating from user votes on reviews. Computed using
     * `AVG(vote_helpful)` function on
     * `shopping_mall_review_votes.vote_helpful` field. Assesses the utility
     * of reviews to other customers, ranging from 0.0 (unhelpful) to 1.0
     * (highly helpful). This metric helps identify high-quality reviews and
     * informs community engagement strategies.
     */
    avg_vote: number;

    /**
     * Timestamp of the most recent review for the product. Determined using
     * `MAX(created_at)` function on `shopping_mall_reviews.created_at`
     * field. Indicates when the last customer feedback was provided. Used
     * to sort products by recency, identify trending items, and identify
     * products needing follow-up attention.
     */
    last_review_date: string & tags.Format<"date-time">;
  };
}
