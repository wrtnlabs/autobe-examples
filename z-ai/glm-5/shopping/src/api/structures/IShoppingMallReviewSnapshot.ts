import { tags } from "typia";

export namespace IShoppingMallReviewSnapshot {
  /**
   * Pagination and sorting parameters for retrieving review snapshot history. Used to navigate through the chronological list of review edit records, showing how ratings and content changed over time. The reviewId is provided as a path parameter, so this request body only controls pagination behavior.
   */
  export type IRequest = {
    /**
     * Maximum number of snapshots to return per page. Used to control response size and pagination behavior.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Page number for pagination, starting from 1. Used to navigate through the snapshot history list.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;
  };

  /**
   * Summary representation of a review snapshot capturing the state transition when a customer edits their review. Records the previous and new rating values (1-5 stars) and text content, along with the timestamp of the modification. Used for displaying complete edit history for audit trails and dispute resolution.
   */
  export type ISummary = {
    /**
     * Unique identifier for this review snapshot record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_review_snapshots.id. UUID primary key used for unique snapshot identification.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The star rating (1-5) before this edit was made.
     *
     * @x-autobe-database-schema-property previous_rating
     * @x-autobe-specification Direct mapping from shopping_mall_review_snapshots.previous_rating. Integer value between 1-5 stars representing the rating before this edit.
     */
    previousRating: number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>;

    /**
     * The star rating (1-5) after this edit was made.
     *
     * @x-autobe-database-schema-property new_rating
     * @x-autobe-specification Direct mapping from shopping_mall_review_snapshots.new_rating. Integer value between 1-5 stars representing the rating after this edit.
     */
    newRating: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>;

    /**
     * The text content of the review before this edit. Null if the review had no text originally.
     *
     * @x-autobe-database-schema-property previous_content
     * @x-autobe-specification Direct mapping from shopping_mall_review_snapshots.previous_content. Nullable text field - null if the review had no text content before the edit.
     */
    previousContent: string | null;

    /**
     * The text content of the review after this edit. Null if text content was removed.
     *
     * @x-autobe-database-schema-property new_content
     * @x-autobe-specification Direct mapping from shopping_mall_review_snapshots.new_content. Nullable text field - null if the customer removed all text content in this edit.
     */
    newContent: string | null;

    /**
     * Timestamp when this snapshot was created, marking when the review edit was submitted.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_review_snapshots.created_at. Timestamp with timezone recording when the snapshot was created (when the edit was submitted).
     */
    createdAt: string & tags.Format<"date-time">;
  };
}
