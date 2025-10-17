import { tags } from "typia";

import { IEEconDiscussVoteType } from "./IEEconDiscussVoteType";
import { IEEconDiscussVoteStatus } from "./IEEconDiscussVoteStatus";
import { IEEconDiscussVoteSortBy } from "./IEEconDiscussVoteSortBy";
import { IESortOrder } from "./IESortOrder";
import { IEEconDiscussPostVoteType } from "./IEEconDiscussPostVoteType";
import { IEEconDiscussPostVoteStatus } from "./IEEconDiscussPostVoteStatus";

export namespace IEconDiscussPostVote {
  /**
   * Search and pagination request for a user’s post voting history.
   *
   * Backed by Interactions.econ_discuss_post_votes, which stores a single row
   * per (user, post) with lifecycle status and timestamps to support
   * idempotency and history.
   */
  export type IRequest = {
    /** Page number for pagination (1-based). */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /** Number of records per page. */
    pageSize?:
      | (number & tags.Type<"int32"> & tags.Minimum<1>)
      | null
      | undefined;

    /**
     * Filter by vote type.
     *
     * Maps to Interactions.econ_discuss_post_votes.vote_type ("up" |
     * "down").
     */
    voteType?: IEEconDiscussVoteType | null | undefined;

    /**
     * Filter by vote lifecycle status.
     *
     * Maps to Interactions.econ_discuss_post_votes.status ("active",
     * "withdrawn", "switched", "discounted", "invalidated").
     */
    status?: IEEconDiscussVoteStatus | null | undefined;

    /**
     * Restrict results to a specific post (Articles.econ_discuss_posts.id,
     * UUID).
     */
    postId?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Lower bound (inclusive) for vote creation time window
     * (Interactions.econ_discuss_post_votes.created_at).
     */
    createdFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound (inclusive) for vote creation time window
     * (Interactions.econ_discuss_post_votes.created_at).
     */
    createdTo?: (string & tags.Format<"date-time">) | null | undefined;

    /** Sort field for vote history (e.g., created_at). */
    sortBy?: IEEconDiscussVoteSortBy | null | undefined;

    /** Sort ordering (ascending/descending). */
    sortOrder?: IESortOrder | null | undefined;
  };

  /**
   * Request body for casting or changing a member's vote on a post.
   *
   * This DTO aligns with Interactions.econ_discuss_post_votes where a single
   * record per (user, post) stores vote_type and lifecycle state. The only
   * client-supplied field is vote_type; identifiers and status fields are
   * system-managed.
   */
  export type ICreate = {
    /**
     * Desired vote type to apply to the target post.
     *
     * SECURITY: Do not accept any user or post identifiers here; those are
     * taken from path/auth context. This field maps to
     * Interactions.econ_discuss_post_votes.vote_type and must be either
     * "up" or "down".
     */
    vote_type: IEEconDiscussVoteType;
  };

  /**
   * Summary representation of a user’s vote on a post for private history
   * views and administrative summaries.
   *
   * Sourced from Interactions.econ_discuss_post_votes. This DTO excludes user
   * identifiers to preserve privacy and focuses on per-record essentials such
   * as target post, type, status, and timestamps.
   */
  export type ISummary = {
    /**
     * Unique identifier of the vote record.
     *
     * Backed by Interactions.econ_discuss_post_votes.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Identifier of the target post that was voted on.
     *
     * Maps to econ_discuss_post_votes.econ_discuss_post_id (FK to
     * Articles.econ_discuss_posts.id).
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Type of vote submitted by the user.
     *
     * Backed by econ_discuss_post_votes.vote_type ("up" or "down").
     */
    voteType: IEEconDiscussPostVoteType;

    /**
     * Lifecycle status of this vote.
     *
     * Backed by econ_discuss_post_votes.status, capturing transitions like
     * withdrawn or switched for auditability.
     */
    status: IEEconDiscussPostVoteStatus;

    /**
     * Timestamp when the vote was created.
     *
     * Backed by econ_discuss_post_votes.created_at (timestamptz).
     */
    createdAt: string & tags.Format<"date-time">;
  };
}
