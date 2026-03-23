import { tags } from "typia";

export namespace IEcommerceMallReviewHelpfulnessVote {
  /**
   * Request body for casting a helpfulness vote on a review.
   */
  export type ICreate = {
    /**
     * The ID of the review to vote on.
     *
     * @x-autobe-database-schema-property review_id
     * @x-autobe-specification Direct mapping from ecommerce_mall_review_helpfulness_votes.review_id.
     */
    review_id: string & tags.Format<"uuid">;
  };
}
