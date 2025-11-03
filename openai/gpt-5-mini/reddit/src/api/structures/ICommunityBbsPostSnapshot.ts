import { tags } from "typia";

import { ICommunityBbsPost } from "./ICommunityBbsPost";
import { ICommunityBbsCommunityMember } from "./ICommunityBbsCommunityMember";

export namespace ICommunityBbsPostSnapshot {
  /**
   * Summary view of a post snapshot. Represents a point-in-time capture of a
   * post used for audit and historical display. All properties reflect fields
   * present in the Prisma model community_bbs_post_snapshots. Includes both
   * convenient summary objects and canonical FK identifiers for traceability
   * and reconciliation.
   */
  export type ISummary = {
    /**
     * Unique identifier of the post snapshot
     * (community_bbs_post_snapshots.id).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Canonical FK id referencing the parent post
     * (community_bbs_post_snapshots.community_bbs_post_id). Included to
     * provide an authoritative identifier for joins and reconciliation;
     * clients may also use the `post` summary for convenience.
     */
    post_id: string & tags.Format<"uuid">;

    /**
     * Reference to the parent post (summary view). Provided for
     * convenience; use `post_id` as the authoritative identifier for
     * persistence-level operations.
     */
    post: ICommunityBbsPost.ISummary;

    /**
     * Canonical FK id referencing the author at snapshot time
     * (community_bbs_post_snapshots.community_bbs_communitymember_id).
     * Included for traceability and to support direct FK lookups.
     */
    author_id: string & tags.Format<"uuid">;

    /**
     * Author of the post at snapshot time (summary view). Provided for
     * convenience and to avoid additional lookups; `author_id` is the
     * canonical identifier.
     */
    author: ICommunityBbsCommunityMember.ISummary;

    /** Snapshot of the post title at snapshot time. */
    title: string;

    /**
     * Snapshot of the post body at snapshot time. Nullable for link/image
     * posts.
     */
    body?: string | null | undefined;

    /** Post type at snapshot time (e.g. 'text','link','image'). */
    post_type: string;

    /** Link URL when applicable; nullable for non-link posts. */
    link_url?: (string & tags.Format<"uri">) | null | undefined;

    /** Cached score value at snapshot time. */
    score: number & tags.Type<"int32">;

    /** Cached upvote count at snapshot time. */
    upvotes: number & tags.Type<"int32">;

    /** Cached downvote count at snapshot time. */
    downvotes: number & tags.Type<"int32">;

    /** Cached number of comments at snapshot time. */
    comment_count: number & tags.Type<"int32">;

    /**
     * Timestamp when the snapshot was taken
     * (community_bbs_post_snapshots.snapshot_at).
     */
    snapshot_at: string & tags.Format<"date-time">;
  };
}
