import { tags } from "typia";

import { IRedditPlatformUser } from "./IRedditPlatformUser";

export namespace IRedditPlatformSearch {
  /**
   * Search request parameters for global search. Contains query terms, entity
   * filters, and pagination configuration.
   *
   * This schema captures all input parameters required for the platform-wide
   * search operation. The query string must be provided to initiate a search,
   * while optional filters allow narrowing results by content type.
   * Pagination parameters ensure efficient result handling by splitting large
   * result sets into manageable pages.
   *
   * Business rules require that queries must contain at least one word, with
   * valid entity types limited to the defined set. Pagination defaults to 20
   * items per page starting from page 1, with strict limits to prevent
   * excessive resource consumption from large page sizes.
   */
  export type IRequest = {
    /**
     * The search query string containing search terms to match against
     * content across all platforms. Must contain at least one word for
     * valid searches. This is the most critical parameter for initiating
     * the search operation.
     *
     * The query should contain relevant search terms that define the scope
     * of the search. Examples include 'apple', 'technology news', or 'user
     * profiles'. But it cannot be empty or whitespace characters.
     *
     * Validation: Must have minLength of 1, and should not contain
     * forbidden characters..
     */
    query: string & tags.MinLength<1>;

    /**
     * List of entity types to include in search results. Valid values are
     * 'posts', 'comments', and 'users'. Allows filtering search results to
     * specific content types for more focused results.
     *
     * The list can contain one or more entity types. For example, including
     * ['posts', 'comments'] would search posts and comments but exclude
     * user profiles. The default is to include all entity types if this
     * parameter is not provided.
     *
     * Validation: Values must be exact from the enum list. No other values
     * are allowed, as they would cause search failures.
     */
    entityTypes?: ("posts" | "comments" | "users")[] | undefined;

    /**
     * Page number for paginated results. Must be at least 1. Default is 1
     * if not provided.
     *
     * This parameter organizes search results into pages for efficient
     * client-side rendering. For example, page 1 shows first 20 items, page
     * 2 shows items 21-40, etc.
     *
     * The parameter naturally handles iterable search functionality by
     * controlling the starting index of results. It cannot be zero or
     * negative, which would cause search errors.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page. Minimum value is 1, maximum is 100. Default
     * is 20 if not provided.
     *
     * This parameter controls the chunk size for each search result page.
     * Limiting items per page improves performance and ensures the client
     * can handle the response efficiently.
     *
     * Exceeding the maximum limit (100) would trigger an error, while a
     * value lower than 1 would also cause validation failure. This control
     * mechanism prevents resource exhaustion.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Summary representation of search results containing essential fields for
   * list display, including source type identification and minimal data to
   * represent each search result. This optimized version provides the
   * necessary context for search listings while maintaining list performance
   * by excluding deep compositions and large text fields.
   *
   * The summary structure enables consistent presentation of results across
   * different result types (posts, comments, users) by including uniform
   * fields like source type indicator and basic identification. Each result
   * contains the unique identifier of the source object (either a post,
   * comment, or user) and a display name or title that provides immediate
   * context to the user.
   *
   * Designed as a lightweight DTO to minimize bandwidth usage in search
   * results, the summary format includes only fields necessary for initial
   * result rendering. This supports efficient user interaction patterns by
   * allowing the client to load more detailed information only when necessary
   * for the specific result the user is exploring.
   */
  export type ISummary = {
    /**
     * The type of the source entity for this search result, allowing
     * clients to determine which resource type is represented. Values
     * indicate whether the result is from posts, comments, or user
     * profiles, enabling clients to render appropriate views for each
     * result type.
     *
     * The enumeration values are standardized according to common search
     * categorization: 'post' for forum posts, 'comment' for comments posted
     * on posts, 'user' for user profile results, and 'community' for
     * community profile results. These values directly correspond to the
     * resource types supported by the global search functionality.
     *
     * This field is critical for maintaining consistent client-side
     * rendering across different result types and is required as part of
     * the unified search API specification.
     */
    sourceType: "post" | "comment" | "user" | "community";

    /**
     * The unique identifier of the source object that matches the search
     * query. This ID corresponds to the primary key in the relevant
     * database table (posts, comments, or users), allowing clients to
     * properly link to the specific resource.
     *
     * UUID format ensures global uniqueness across all resource types and
     * supports future scalability of the search functionality across
     * different resource domains. This field is essential for routing
     * search results to the appropriate detail views.
     *
     * Clients can use this field to construct proper URLs or API calls to
     * fetch the full resource information, making it the foundation for
     * user navigation within the search results.
     */
    sourceId: string & tags.Format<"uuid">;

    /**
     * The primary title or identifier to display in the search result
     * listing. For posts and comments, this is a truncated or
     * representative version of content. For user profiles, this typically
     * represents the user's display name or username.
     *
     * This field is optimized for user consumption in lists, providing
     * immediate context without requiring full content loading. For posts,
     * it may include the first sentence of content or headline; for
     * comments, the starting text; for user profiles, the username or
     * display name.
     *
     * Design note: This field is specifically designed to be brief enough
     * for list views while still providing meaningful information to
     * users.
     */
    displayTitle: string;

    /**
     * The author's profile summary associated with this search result. For
     * posts and comments, this identifies the creator. For user profiles,
     * this would reference the user as their own author.
     *
     * This field uses .ISummary to provide the necessary author context
     * without loading full user objects, optimizing performance for search
     * results lists. The summary format contains only the essential
     * identifiers and display name required for the search context,
     * avoiding the loading of detailed profile information that isn't
     * needed at the list level.
     *
     * Using .ISummary ensures that search results don't become bloated with
     * unnecessary data while still providing author context.
     */
    authorId: IRedditPlatformUser.ISummary;

    /**
     * The relevance score indicating how closely this result matches the
     * search query. Higher values indicate better matches, with the score
     * representing a calculated relevance rating from the search
     * algorithm.
     *
     * The scoring algorithm considers factors such as keyword match,
     * content similarity, recency, and user interaction patterns. A high
     * score (e.g., 0.9+) indicates a strong match, while lower scores
     * (e.g., 0.3-) indicate weaker matches that might be included as
     * secondary suggestions.
     *
     * This value informs users about the quality of the match and helps
     * prioritize results in the UI, particularly when multiple results have
     * similar relevance.
     */
    score: number & tags.Minimum<0>;
  };
}
