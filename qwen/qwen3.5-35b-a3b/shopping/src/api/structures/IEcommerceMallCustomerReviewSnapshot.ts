import { tags } from "typia";

export namespace IEcommerceMallCustomerReviewSnapshot {
  /**
   * Customer review snapshot summary optimized for audit trail list displays.
   *
   * Captures immutable audit snapshots of customer review modifications, preserving the review's complete state (rating, body text, and status) at each edit point. Used in paginated lists displaying review modification history.
   */
  export type ISummary = {
    /**
     * Unique identifier for this customer review snapshot record.
     *
     * A UUID v4 value that uniquely identifies this snapshot version. Used for API lookups and version tracking in the audit trail.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_customer_review_snapshots.id. Primary key UUID.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Star rating (1-5) of the review at the time this snapshot was created.
     *
     * The customer's rating as it existed during this version of the review. Changes to the rating over time are preserved as separate snapshot records.
     *
         * @x-autobe-database-schema-property rating
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_customer_review_snapshots.rating. Integer value 1-5
         *   from DB.
     */
    rating: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>;

    /**
     * Review text content at the time this snapshot was created.
     *
     * The customer's written feedback as it existed when this snapshot was captured. Multiple snapshots may have different body text reflecting review edits. Nullable: reviews can exist with only ratings and no text content.
     *
         * @x-autobe-database-schema-property body
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_customer_review_snapshots.body. Nullable string from
         *   DB.
     */
    body: string | null;

    /**
     * Review status (active/deleted) at the time this snapshot was created.
     *
     * Records whether the review was active or deleted when this snapshot was generated. Essential for audit compliance as it preserves the state even if the main review is later modified or the status changes again.
     *
         * @x-autobe-database-schema-property status
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_customer_review_snapshots.status. String value
         *   indicating review status at snapshot time.
     */
    status: string;

    /**
     * Timestamp when this snapshot was created, representing the point-in-time of the review state.
     *
     * The exact date and time when the review version existed. Used for sorting snapshots chronologically in the audit trail.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_customer_review_snapshots.created_at. Timestamp from
         *   DB.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
