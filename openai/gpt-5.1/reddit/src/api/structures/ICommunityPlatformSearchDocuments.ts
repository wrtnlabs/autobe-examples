import { tags } from "typia";

export namespace ICommunityPlatformSearchDocuments {
  /**
   * Request DTO for executing a rich, cross-entity document search over
   * public content in the community platform.
   *
   * This DTO represents the input to the documents search endpoint that
   * queries communities, posts, comments, and user profiles using full-text
   * terms plus structured filters. It is intended for read-only discovery of
   * public documents and does not map to a single Prisma table; instead it
   * targets a combination of core content models and search index metadata.
   */
  export type IRequest = {
    /**
     * Primary free-text search query applied to the community platform
     * document corpus. May match against titles, bodies, user display
     * names, and other indexed fields depending on the search backend
     * configuration. Implementations may enforce a minimum length and apply
     * normalization or tokenization.
     */
    query: string;

    /**
     * Optional list of community codes used to restrict search results to
     * specific communities.
     *
     * Each entry refers to a community uniquely identified by a
     * human-readable code, which typically corresponds to a field such as
     * `code` or `slug` in the `community_platform_communities` model. When
     * provided, only documents belonging to one of the referenced
     * communities should be considered by the search engine.
     */
    communityCodes?: string[] | undefined;

    /**
     * Optional list of document type filters limiting the search scope to
     * certain entity categories.
     *
     * Each value identifies a supported document type in the search corpus,
     * such as:
     *
     * - "community" – community containers
     * - "post" – posts inside communities
     * - "comment" – comments and nested replies
     * - "profile" – public user profiles
     *
     * When omitted or empty, all supported types may be considered.
     */
    types?: string[] | undefined;

    /**
     * Optional lower bound for the document creation or publication
     * timestamp used when filtering results by time range.
     *
     * Represents an ISO 8601 date-time string (for example,
     * `2025-01-01T00:00:00Z`). When provided, only documents created or
     * published at or after this timestamp should be considered.
     */
    from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional upper bound for the document creation or publication
     * timestamp used when filtering results by time range.
     *
     * Represents an ISO 8601 date-time string (for example,
     * `2025-12-31T23:59:59Z`). When provided together with `from`, the
     * backend should return documents whose timestamps fall within the
     * inclusive range.
     */
    to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Sort mode for document search results.
     *
     * Typical values include:
     *
     * - "relevance" – order by search score (default when unspecified)
     * - "new" – order by creation or publication time descending
     * - "top" – order by a popularity or engagement metric (such as votes or
     *   karma)
     *
     * Backends should validate and normalize the value, falling back to
     * "relevance" when omitted or invalid.
     */
    sort?: string | undefined;

    /**
     * Page number for paginated document search results, starting from 1.
     * The backend should coerce values less than 1 to 1 and combine this
     * with `limit` to determine the offset into the result set.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of search results to return per page. Implementations
     * should enforce sensible bounds (for example a default of 20 and a
     * maximum of 100) to protect performance and avoid excessive payload
     * sizes.
     */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;
  };
}
