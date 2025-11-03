import { tags } from "typia";

export namespace IDiscussionBoardSearch {
  /**
   * Request DTO for global search across articles, comments, attachments and
   * tags. Contains the required query string plus optional filters,
   * pagination primitives (page, limit) and sorting options. NOTE: This is a
   * REQUEST schema — do not use response pagination wrappers here. Field
   * names use camelCase to align with API conventions.
   *
   * Filters summary (see `filters` property): supported keys include:
   *
   * - Types: array of entity types to include (e.g.,
   *   ['article','comment','attachment','tag'])
   * - CategoryId: UUID to filter articles by primary category
   * - TagSlugs: array of tag slug strings to filter articles by tags
   * - AuthorUsername: exact username (discussion_board_member.username)
   * - CreatedFrom / createdTo: ISO 8601 datetimes to restrict created/published
   *   date ranges
   *
   * Visibility note: Public callers MUST expect that results are already
   * filtered server-side to exclude soft-deleted or
   * moderation-hidden/quarantined content (deleted_at != null, state !=
   * 'published', is_hidden = true, quarantined = true).
   */
  export type IRequest = {
    /**
     * Non-empty full-text search query used to search article
     * titles/content, comment text, tag names and author display names.
     * Clients must provide a non-empty string.
     */
    query: string & tags.MinLength<1>;

    /**
     * Optional named filter object (IDiscussionBoardSearch.IFilters) to
     * restrict the search results. Use camelCase keys: types (string[]),
     * categoryId (uuid), tagSlugs (string[]), authorUsername (string),
     * createdFrom (ISO 8601 datetime), createdTo (ISO 8601 datetime).
     */
    filters?: IDiscussionBoardSearch.IFilters | undefined;

    /** Page number for pagination (1-based). */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /** Number of items per page. Server enforces a maximum of 100. */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Sort order for results. Mapping: 'newest'/'oldest' map to
     * published_at where applicable, otherwise created_at. Use 'relevance'
     * for full-text scoring.
     */
    sort?: "relevance" | "newest" | "oldest" | undefined;

    /**
     * When true, the response may include highlighted snippets for matched
     * fields to assist UI presentation. This may increase payload size.
     */
    highlight?: boolean | undefined;
  };

  /**
   * Named filter object for the global search endpoint. Extracted from inline
   * filters to improve reusability and clarity. NOTE: public callers MUST NOT
   * request non-public article states; servers MUST enforce visibility
   * restrictions and audit privileged queries.
   */
  export type IFilters = {
    /**
     * Restrict result types to one or more of the allowed entity types. If
     * omitted, all types are searched. Each element must exactly match one
     * of the allowed literal tokens.
     */
    types?:
      | (("article" | "comment" | "attachment" | "tag")[] & tags.MinItems<1>)
      | undefined;

    /**
     * Filter articles by primary category id
     * (discussion_board_categories.id). Use UUID string. Nullable when not
     * provided.
     */
    categoryId?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Filter articles by tag slugs (discussion_board_tags.slug). Provide an
     * array of tag slug strings. Max 10 slugs to reflect article tag
     * cardinality constraints.
     */
    tagSlugs?: (string[] & tags.MinItems<0> & tags.MaxItems<10>) | undefined;

    /**
     * Filter results by author username (discussion_board_member.username).
     * Exact-match on username; servers resolve username to member id for DB
     * queries.
     */
    authorUsername?: string | undefined;

    /**
     * Optional lifecycle state filter for articles. Allowed values:
     * 'draft','published','pending_review','hidden'. Public callers MUST
     * NOT request non-public states (draft/pending_review/hidden); server
     * enforces privilege checks for such filters.
     */
    state?: "draft" | "published" | "pending_review" | "hidden" | undefined;

    /**
     * Optional filter to return only pinned (true) or unpinned (false)
     * articles. Maps to discussion_board_articles.is_pinned.
     */
    is_pinned?: boolean | undefined;

    /**
     * ISO 8601 start datetime for date-range filtering (inclusive). Server
     * behavior: for draft-oriented queries this filter applies to
     * created_at; for published-oriented queries the server applies it to
     * published_at. Clients should prefer explicit scoping where
     * available.
     */
    createdFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * ISO 8601 end datetime for date-range filtering (inclusive). See
     * createdFrom for application semantics.
     */
    createdTo?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
