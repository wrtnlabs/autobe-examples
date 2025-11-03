import { tags } from "typia";

import { IDiscussionBoardArticle } from "./IDiscussionBoardArticle";

export namespace IDiscussionBoardArticleSnapshot {
  /**
   * Request DTO for searching and paginating article snapshots. Used by
   * moderator endpoints to filter historical snapshots
   * (discussion_board_article_snapshots). NOTE: author_username is a
   * convenience filter (resolved server-side to a member id via join); the
   * server must validate existence and enforce moderator-only usage for
   * performance-sensitive queries. When used with a path-scoped endpoint that
   * already provides articleId in the URL, clients SHOULD NOT include
   * article_id in the body; the server will validate and reject conflicting
   * values.
   */
  export type IRequest = {
    /** Page number for pagination (1-based). */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /** Number of items per page. Max 100. */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Sort key. Allowed values:
     * 'snapshot_at','-snapshot_at','created_at','-created_at','relevance'.
     * Use '-...' variants for descending order where supported.
     */
    sort?:
      | "snapshot_at"
      | "-snapshot_at"
      | "created_at"
      | "-created_at"
      | "relevance"
      | undefined;

    /**
     * Free-text search applied to snapshot title and content (uses
     * trigram/full-text indexes). Server may apply query timeouts and rate
     * limits for heavy searches.
     */
    search?: string | undefined;

    /**
     * Filter by article state captured in the snapshot. Public callers must
     * not request non-public states; moderator endpoints may use this
     * filter.
     */
    state?: "draft" | "published" | "pending_review" | "hidden" | undefined;

    /** Inclusive lower bound for snapshot_at (ISO 8601). */
    snapshot_from?: (string & tags.Format<"date-time">) | undefined;

    /** Inclusive upper bound for snapshot_at (ISO 8601). */
    snapshot_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional filter by author username
     * (discussion_board_member.username). Server resolves username ->
     * member id via joined article relation; this resolution is performed
     * server-side and may be restricted to moderator callers. Use for
     * human-friendly selection, not as a persisted snapshot column.
     */
    author_username?: string | undefined;

    /**
     * Optional filter by article id
     * (discussion_board_article_snapshots.discussion_board_article_id).
     * When used with path-scoped endpoints that include articleId in the
     * URL, clients MUST NOT provide this field in the body to avoid
     * duplication; server will validate and reject conflicting values.
     */
    article_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * When true, include lightweight aggregation counts in the pagination
     * metadata (implementation may populate).
     */
    include_counts?: boolean | undefined;
  };

  /**
   * Summary view of an article snapshot. Maps to Prisma model
   * discussion_board_article_snapshots. Includes a parent article summary for
   * context (useful in audit and history listings). Fields mirror
   * denormalized snapshot columns and provide clear guidance on formats and
   * sanitization.
   */
  export type ISummary = {
    /** Unique snapshot identifier (discussion_board_article_snapshots.id). */
    id: string & tags.Format<"uuid">;

    /**
     * Parent article summary providing context for this snapshot. Derived
     * from discussion_board_article_snapshots.discussion_board_article_id.
     * For typical snapshot records this will be present; if the original
     * article was later anonymized/deleted the server may return a
     * lightweight placeholder or null depending on retention/anonymization
     * policy. Moderators receive full context.
     */
    article: IDiscussionBoardArticle.ISummary;

    /**
     * Article title captured at snapshot time
     * (discussion_board_article_snapshots.title).
     */
    title: string;

    /**
     * Timestamp when the snapshot was taken (ISO 8601 UTC). Maps to
     * discussion_board_article_snapshots.snapshot_at.
     */
    snapshot_at: string & tags.Format<"date-time">;

    /**
     * Original article creation time denormalized into the snapshot
     * (discussion_board_article_snapshots.created_at). This field is
     * non-nullable in the Prisma model and is therefore required in the
     * DTO.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Article lifecycle state captured at snapshot time. Mirrors
     * discussion_board_article_snapshots.state. This is non-nullable in the
     * Prisma model and therefore required.
     */
    state: "draft" | "published" | "pending_review" | "hidden";

    /**
     * Optional short excerpt derived from the denormalized content to
     * assist list and search UIs. Server SHOULD sanitize and truncate (for
     * example to 200-500 characters) and MUST strip executable/unsafe
     * content. Nullable when not provided.
     */
    content_excerpt?: string | null | undefined;

    /**
     * Original article updated_at timestamp denormalized into the snapshot
     * (nullable).
     */
    updated_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Original article deleted_at value (denormalized). Nullable when the
     * article was not deleted at snapshot time.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
