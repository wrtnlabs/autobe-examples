import { tags } from "typia";

export namespace IDiscussionBoardTag {
  /**
   * Lightweight tag summary for display in article lists, tag clouds, and tag browsing interfaces. Contains only essential identification and display text for tag-based navigation and filtering. Tags support article categorization beyond section-based organization.
   */
  export type ISummary = {
    /**
     * Unique identifier for the tag. Used for tag selection, filtering articles by tag, and referencing tags in API operations.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_tags.id (UUID primary key). Used for tag references in article-tag associations and tag filtering operations.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Display text of the tag. Normalized to lowercase for case-insensitive matching. Examples: 'politics', 'economic-policy', 'current_affairs'.
     *
     * @x-autobe-database-schema-property value
     * @x-autobe-specification Direct mapping from discussion_board_tags.value. Normalized to lowercase during storage. Contains only alphanumeric characters, hyphens (-), and underscores (_). Maximum 50 characters. Unique constraint enforced at database level.
     */
    value: string;
  };

  /**
   * Request parameters for retrieving a paginated list of tags with optional search filtering. Supports case-insensitive partial matching on tag values via the search parameter, and standard pagination controls via page number and items-per-page limit. All parameters are optional—omitting them returns all tags with default pagination (page 1, limit 20).
   */
  export type IRequest = {
    /**
     * Search term for filtering tags by partial value match. Case-insensitive matching finds tags containing the search text anywhere in the tag value. Leave empty to return all tags.
     *
     * @x-autobe-specification Applies case-insensitive partial matching filter using ILIKE or LOWER() on discussion_board_tags.value column. Implementation: WHERE LOWER(value) LIKE LOWER('%' || search || '%') or WHERE value ILIKE '%' || search || '%'. Whitespace is trimmed from input. When null or empty string, no filter is applied.
     */
    search?: string | undefined;

    /**
     * Page number for paginated results (1-indexed). Defaults to page 1 if not specified. Use with limit to control pagination.
     *
     * @x-autobe-specification Calculates SQL OFFSET as (page - 1) * limit. Default value: 1. Minimum: 1. Used with limit for standard LIMIT/OFFSET pagination. If page exceeds total pages, returns empty result set with correct pagination metadata.
     */
    page?: (number & tags.Type<"int32">) | undefined;

    /**
     * Maximum number of tags to return per page. Defaults to 20, maximum allowed is 100. Use lower values for faster responses on large datasets.
     *
     * @x-autobe-specification Passed directly to SQL LIMIT clause to restrict rows returned per page. Default: 20, Maximum: 100. If limit > 100, clamp to 100. If limit <= 0, use default 20. Lower values improve response time for large tag sets.
     */
    limit?: (number & tags.Type<"int32">) | undefined;
  };
}
