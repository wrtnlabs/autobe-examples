import { tags } from "typia";

export namespace ICommunityPlatformSearchIndex {
  /**
   * Request DTO for executing a global multi-entity search across the
   * community platform.
   *
   * This DTO captures the user’s search intent for the global discovery
   * endpoint that aggregates communities, posts, comments, and user profiles
   * into a unified search result set. It allows clients to specify a
   * free-text query, optional filters for which entity types to include, and
   * pagination and sorting preferences. The request is designed for read-only
   * search and does not directly map to a single Prisma model because the
   * underlying implementation may combine data from multiple tables or a
   * denormalized search index.
   */
  export type IRequest = {
    /**
     * Free-text search query string used to match against indexed content
     * across communities, posts, comments, and user profiles. This may be
     * applied to titles, bodies, display names, and other searchable fields
     * depending on the search backend configuration. Implementations may
     * enforce minimum length or sanitize input to prevent abuse.
     */
    query: string;

    /**
     * Optional list of result type filters that restrict the global search
     * to specific entity kinds.
     *
     * When omitted or empty, the search backend may return all supported
     * types. When provided, the backend should only return results whose
     * type matches at least one of the specified values. Each value is a
     * discriminator understood by the search layer.
     *
     * Common examples include:
     *
     * - "community" – community containers
     * - "post" – main posts within communities
     * - "comment" – comments and nested replies
     * - "profile" – user profile summaries
     */
    types?: string[] | undefined;

    /**
     * Page number for paginated global search results, starting from 1. The
     * backend should treat values less than 1 as 1. This works together
     * with `limit` to determine which slice of results is returned.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of search results to return in a single page.
     *
     * The provider should enforce reasonable minimum and maximum values
     * (for example, defaulting to 20 and capping at 100) to avoid
     * excessively large result sets and ensure predictable performance.
     */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Sort mode for global search results.
     *
     * Typical values include:
     *
     * - "relevance" – order by search score (default for most search
     *   experiences)
     * - "new" – order by creation time descending
     * - "top" – order by aggregated score metrics such as upvotes or karma
     *
     * The backend should validate the provided value and fall back to a
     * sensible default (usually "relevance") when omitted or invalid.
     */
    sort?: string | undefined;
  };

  /**
   * Summary representation of a single item in the global search results of
   * the community platform.
   *
   * Global search can return heterogeneous entities such as communities,
   * posts, comments, and member profiles. This summary DTO provides a
   * unified, type-tagged view of each search match that frontends can render
   * in a single combined list while still being able to branch on the
   * concrete entity type. It is intentionally compact to keep search result
   * payloads efficient.
   */
  export type ISummary = {
    /**
     * Opaque identifier of the matched entity.
     *
     * For posts, comments, communities, or users this is typically the
     * primary key of the underlying table, but it is treated as an opaque
     * string at the API boundary. Consumers must interpret this identifier
     * based on the `entity_type` field and should not assume a particular
     * format beyond string semantics.
     */
    id: string;

    /**
     * Discriminator indicating what kind of domain entity this search
     * result represents.
     *
     * Typical values include `community`, `post`, `comment`, and `user`.
     * The exact set of supported values is maintained in backend business
     * logic and may evolve over time. Clients MUST treat this value as an
     * open set and implement a safe fallback rendering for unknown values.
     */
    entity_type: string;

    /**
     * Primary display title for this search result.
     *
     * For communities this is the community name, for posts it is the post
     * title, for comments it is often the first portion of the comment
     * body, and for users it may be the displayed username. This field is
     * intended for prominent display in result rows.
     */
    title: string;

    /**
     * Optional short summary text or snippet providing additional context
     * about the search result.
     *
     * This can contain an excerpt of the matching content with search terms
     * highlighted, a short community description, or user profile tagline.
     * Clients may display this as secondary text in multi-line result
     * rows.
     */
    summary?: string | undefined;

    /**
     * Human-readable context label giving additional classification of the
     * search result.
     *
     * Examples include the community name for posts and comments (e.g.,
     * "r/typescript"), or a user role label like "Moderator". This value is
     * optional and is intended primarily for visual hints rather than
     * programmatic logic.
     */
    context?: string | undefined;

    /**
     * Front-end navigation URL pointing to the canonical page for this
     * search result.
     *
     * When the user selects a search result row, the client should navigate
     * to this URL using its routing mechanism. This URL is generated on the
     * server side to ensure consistency with other navigation primitives.
     */
    href: string & tags.Format<"uri">;

    /**
     * Relevance score used internally for ranking and for optional
     * client-side row decorations.
     *
     * Higher values indicate stronger matches based on the search engine's
     * ranking algorithm. Clients are not required to display this value but
     * may use it for debugging, experimentation, or specialized
     * visualizations.
     */
    score?: number | undefined;
  };
}
