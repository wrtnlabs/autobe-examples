import { tags } from "typia";

export namespace ITodoAppGlobalSearch {
  /**
   * Request DTO for the global search endpoint. Accepts a free-text query,
   * pagination (offset or cursor), optional entity filters and scoping
   * filters. By convention this search excludes soft-deleted entities
   * (deleted_at IS NOT NULL) and enforces visibility rules: private
   * lists/tasks are returned only to authorized callers (owner or accepted
   * collaborator). Pagination supports either offset-style (page/pageSize) or
   * cursor-style (cursor) — clients SHOULD NOT send both; servers MAY prefer
   * cursor when provided or return 400 for mixed usage.
   */
  export type IRequest = {
    /**
     * Full-text search query string. May be null when callers rely on
     * structured filters instead. When provided, servers SHOULD apply
     * relevance scoring and may use text-indexes for matching. Example:
     * "groceries"
     */
    query?: string | null | undefined;

    /**
     * 1-based page number for offset pagination. Default: 1. When using
     * cursor-based pagination (cursor), this parameter is ignored.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page for offset pagination. Default: 25. Servers
     * SHOULD clamp to a safe maximum to prevent abuse.
     */
    pageSize?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>)
      | undefined;

    /**
     * Opaque pagination cursor for stable cursor-based pagination. When
     * present, server MAY ignore page/pageSize in favor of cursor
     * semantics. Clients SHOULD treat this as mutually exclusive with
     * page/pageSize.
     */
    cursor?: string | null | undefined;

    /**
     * Optional list of entity types to restrict the search to. When
     * omitted, the search covers all supported entity types. Allowed
     * values: 'task','list','user','tag'.
     */
    entityFilters?: ("task" | "list" | "user" | "tag")[] | undefined;

    /**
     * Optional owner UUID to scope results to resources owned by a specific
     * todo user. Must be a valid RFC-4122 UUID when present. Servers
     * validate format and permissions; unauthorized scopes should return
     * 403.
     */
    ownerId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Optional list UUID to limit task hits to a particular list. Must be a
     * valid RFC-4122 UUID when present. Servers validate visibility and
     * existence.
     */
    listId?: (string & tags.Format<"uuid">) | undefined;

    /** Field used to sort returned hits. */
    sortBy?: "relevance" | "createdAt" | "updatedAt" | undefined;

    /** Sort direction for the results. Default: 'asc'. */
    order?: "asc" | "desc" | undefined;

    /**
     * When true, the server SHOULD include short matched text snippets for
     * each hit when supported by the backend index. Default: false.
     */
    includeSnippets?: boolean | undefined;

    /**
     * When true, the server MAY include highlight metadata for match
     * locations (if supported). Default: false.
     */
    highlight?: boolean | undefined;

    /**
     * When true, restrict results strictly to resources the caller is
     * authorized to view (owner or accepted collaborator for private
     * resources). Servers MUST enforce visibility regardless of this flag;
     * this flag requests stricter enforcement in multi-tenant scenarios.
     * Default: true.
     */
    restrictToAccessible?: boolean | undefined;
  };
}
