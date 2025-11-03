import { tags } from "typia";

import { ICommunityBbsComment } from "./ICommunityBbsComment";
import { ICommunityBbsCommunityMember } from "./ICommunityBbsCommunityMember";

export namespace ICommunityBbsCommentSnapshot {
  /**
   * Summary view of a comment snapshot capturing a comment's state at a point
   * in time. Based on the Prisma model community_bbs_comment_snapshots.
   * Exposes both summary objects and canonical FK ids to maintain
   * traceability and enable efficient joins/reconciliation.
   */
  export type ISummary = {
    /**
     * Unique identifier of the comment snapshot
     * (community_bbs_comment_snapshots.id).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Canonical FK id referencing the source comment
     * (community_bbs_comment_snapshots.community_bbs_comment_id). Use this
     * id for authoritative joins and reconciliation.
     */
    comment_id: string & tags.Format<"uuid">;

    /**
     * Reference to the comment summary that this snapshot represents.
     * Provided for convenience; `comment_id` is the canonical identifier.
     */
    comment: ICommunityBbsComment.ISummary;

    /**
     * Optional actor id that created the snapshot
     * (community_bbs_comment_snapshots.community_bbs_snapshot_by_id).
     * Nullable when snapshot creation was performed by a background system
     * process. Use this FK for audit traceability.
     */
    snapshot_by_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Actor who created the snapshot (nullable when created by background
     * processes). Provided for convenience; `snapshot_by_id` is the
     * canonical identifier.
     */
    snapshotBy?: ICommunityBbsCommunityMember.ISummary | null | undefined;

    /** Comment body captured at snapshot time. */
    body: string;

    /** Cached score value at snapshot time. */
    score: number & tags.Type<"int32">;

    /** Cached upvote count at snapshot time. */
    upvotes: number & tags.Type<"int32">;

    /** Cached downvote count at snapshot time. */
    downvotes: number & tags.Type<"int32">;

    /**
     * Timestamp representing the point-in-time the snapshot captures
     * (community_bbs_comment_snapshots.snapshot_at).
     */
    snapshot_at: string & tags.Format<"date-time">;

    /**
     * Record creation timestamp for the snapshot entry
     * (community_bbs_comment_snapshots.created_at).
     */
    created_at: string & tags.Format<"date-time">;
  };
}
