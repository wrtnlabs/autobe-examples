import { tags } from "typia";

import { IEEconDiscussBookmarkSortBy } from "./IEEconDiscussBookmarkSortBy";
import { IESortOrder } from "./IESortOrder";

export namespace IEconDiscussPostBookmark {
  /**
   * Search and pagination request for a member’s saved post bookmarks.
   *
   * Backed by Interactions.econ_discuss_post_bookmarks joined with
   * Articles.econ_discuss_posts for display metadata. Supports filtering by
   * note presence and time windows while excluding rows with deleted_at set.
   */
  export type IRequest = {
    /** Page number for pagination (1-based). */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /** Number of records per page (server-capped). */
    pageSize?:
      | (number & tags.Type<"int32"> & tags.Minimum<1>)
      | null
      | undefined;

    /**
     * Optional keyword applied to saved post context (e.g., title/summary
     * via join to Articles.econ_discuss_posts). Not stored on
     * Interactions.econ_discuss_post_bookmarks.
     */
    q?: string | null | undefined;

    /**
     * Restrict to a specific saved post (Articles.econ_discuss_posts.id,
     * UUID).
     */
    postId?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Filter bookmarks by presence of an owner-only personal note.
     *
     * Maps to Interactions.econ_discuss_post_bookmarks.note (String?).
     */
    hasNote?: boolean | null | undefined;

    /**
     * Lower bound (inclusive) for bookmark creation time window
     * (Interactions.econ_discuss_post_bookmarks.created_at).
     */
    createdFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound (inclusive) for bookmark creation time window
     * (Interactions.econ_discuss_post_bookmarks.created_at).
     */
    createdTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Sort field for saved items list (e.g., created_at or updated_at on
     * Interactions.econ_discuss_post_bookmarks).
     */
    sortBy?: IEEconDiscussBookmarkSortBy | null | undefined;

    /** Sort ordering (ascending/descending). */
    sortOrder?: IESortOrder | null | undefined;
  };

  /**
   * Request body to create (or reinstate) a bookmark for a post.
   *
   * This DTO corresponds to Interactions.econ_discuss_post_bookmarks where
   * each row is unique per (user, post). Only the private note is accepted
   * from clients; the owning user and target post are derived from auth/path
   * context.
   */
  export type ICreate = {
    /**
     * Optional owner-only private note to attach to the saved item.
     *
     * Maps to Interactions.econ_discuss_post_bookmarks.note. This text is
     * visible only to the bookmark owner and is excluded from any shared
     * views. The business requirements recommend a maximum of 2,000
     * characters.
     */
    note?: string | null | undefined;
  };

  /**
   * Summary view of a post bookmark owned by a member.
   *
   * Backed by the Interactions table econ_discuss_post_bookmarks, which
   * records per-user saved items for posts and supports private notes,
   * created/updated timestamps, and a soft-deletion column (deleted_at). This
   * summary omits internal lifecycle fields and surfaces only owner-facing
   * attributes suitable for list views.
   */
  export type ISummary = {
    /**
     * Bookmark identifier.
     *
     * Maps to Interactions.econ_discuss_post_bookmarks.id (UUID primary
     * key) in the Prisma schema. Used to uniquely reference a saved item
     * record for the owner.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Owner user identifier.
     *
     * Derived from econ_discuss_post_bookmarks.econ_discuss_user_id (FK →
     * Actors.econ_discuss_users.id). Indicates who created and owns this
     * bookmark entry.
     */
    userId: string & tags.Format<"uuid">;

    /**
     * Target post identifier.
     *
     * Derived from econ_discuss_post_bookmarks.econ_discuss_post_id (FK →
     * Articles.econ_discuss_posts.id). Points to the saved post.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Owner-only personal note attached to the saved item.
     *
     * Maps to econ_discuss_post_bookmarks.note. Notes are private to the
     * owner and are excluded from any shared views; null when not
     * provided.
     */
    note?: string | null | undefined;

    /**
     * Bookmark creation timestamp (ISO 8601).
     *
     * Maps to econ_discuss_post_bookmarks.created_at (timestamptz). Used
     * for listing and sorting.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Last update timestamp of the bookmark (ISO 8601), including note
     * edits.
     *
     * Maps to econ_discuss_post_bookmarks.updated_at (timestamptz).
     */
    updatedAt: string & tags.Format<"date-time">;
  };
}
