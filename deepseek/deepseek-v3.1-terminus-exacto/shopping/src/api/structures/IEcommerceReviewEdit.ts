import { tags } from "typia";

import { IEcommerceReview } from "./IEcommerceReview";

export namespace IEcommerceReviewEdit {
  /**
   * Request parameters for filtering and paginating review edit history snapshots. Allows searching by edit date range, rating changes, and content modifications.
   */
  export type IRequest = {
    edited_at_start?: (string & tags.Format<"date-time">) | null | undefined;
    edited_at_end?: (string & tags.Format<"date-time">) | null | undefined;
    rating_before?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>)
      | null
      | undefined;
    rating_after?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>)
      | null
      | undefined;
    content_contains?: string | null | undefined;
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Summary view of a review edit snapshot showing essential modification metadata without detailed content changes. Used for administrative audit trail listings and review modification history displays.
   */
  export type ISummary = {
    /**
     * Unique identifier of the review edit snapshot.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_review_edits.id. Primary key identifier.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the review modification occurred.
     *
     * @x-autobe-database-schema-property edited_at
     * @x-autobe-specification Direct mapping from ecommerce_review_edits.edited_at. Represents exact moment of review modification.
     */
    edited_at: string & tags.Format<"date-time">;

    /**
     * Rating value (1-5 stars) before the edit was applied.
     *
     * @x-autobe-database-schema-property rating_before
     * @x-autobe-specification Direct mapping from ecommerce_review_edits.rating_before. Captures previous rating state for audit trail.
     */
    rating_before: number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>;

    /**
     * Rating value (1-5 stars) after the edit was applied.
     *
     * @x-autobe-database-schema-property rating_after
     * @x-autobe-specification Direct mapping from ecommerce_review_edits.rating_after. Captures new rating state for audit trail.
     */
    rating_after: number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>;

    /**
     * Reference to the review that was modified.
     *
     * @x-autobe-database-schema-property review
     * @x-autobe-specification Join via ecommerce_review_id foreign key to ecommerce_reviews table. Returns IEcommerceReview.ISummary for reference.
     */
    review: IEcommerceReview.ISummary;
  };
}
