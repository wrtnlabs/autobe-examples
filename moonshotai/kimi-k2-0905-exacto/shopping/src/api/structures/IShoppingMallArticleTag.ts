import { tags } from "typia";

export namespace IShoppingMallArticleTag {
  /**
   * Search parameters for article tag filtering, sorting, and pagination
   * configuration. Enables flexible tag discovery through multiple criteria
   * including text search, channel filtering, visibility settings, and
   * usage-based sorting for content organization and management.
   */
  export type IRequest = {
    /**
     * Page number for paginated results (1-based indexing). Controls which
     * subset of results to return when dealing with large tag collections.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of results per page. Default 20, maximum 100 to balance
     * performance and usability for tag browsing interfaces.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Text search query for tag name and description. Supports partial
     * matching and case-insensitive search across tag metadata for flexible
     * content discovery.
     */
    search?: (string & tags.MaxLength<100>) | undefined;

    /**
     * Filter by specific channel code. Restricts results to tags associated
     * with a particular marketplace channel for channel-specific content
     * organization.
     */
    channelCode?: (string & tags.MaxLength<50>) | undefined;

    /**
     * Filter by tag visibility status. When true, returns only publicly
     * visible tags for customer-facing interfaces. When false, returns
     * hidden tags for administrative purposes. When null, returns all tags
     * regardless of visibility.
     */
    visible?: boolean | undefined;

    /**
     * Field to sort results by. Supports sorting by tag metadata, creation
     * timestamps, or usage frequency for different organizational needs.
     */
    sortBy?:
      | "name"
      | "code"
      | "sequence"
      | "createdAt"
      | "updatedAt"
      | "usageCount"
      | undefined;

    /**
     * Sorting direction. Ascending for alphabetical or chronological
     * ordering, descending for reverse order or popularity-based sorting.
     */
    sortOrder?: "asc" | "desc" | undefined;

    /**
     * Exact tag code filter. Useful for finding specific tags by their
     * unique system identifier rather than display name.
     */
    code?: (string & tags.MaxLength<50>) | undefined;

    /**
     * Exact tag name filter. Case-sensitive matching for precise tag
     * identification by display name.
     */
    name?: (string & tags.MaxLength<100>) | undefined;
  };

  /**
   * Article tag management system enabling flexible content categorization
   * and cross-content relationship building for enhanced content discovery
   * and organization.
   *
   * Article tags provide granular content organization beyond hierarchical
   * categories, supporting dynamic association linking, trending topic
   * identification, and SEO optimization through semantic relationship
   * building. The system enables both automated tag generation based on
   * content analysis and manual tag application for precise content
   * classification.
   *
   * Tags support content discovery optimization, readership targeting, and
   * engagement analysis while providing flexible categorization that adapts
   * to changing content themes and reader interests across the platform's
   * publication ecosystem.
   */
  export type ISummary = {
    /** Primary Key. */
    id: string & tags.Format<"uuid">;

    /** Unique tag identifier for system reference. */
    code: string;

    /** Tag display name for user interface and navigation. */
    name: string;

    /** Tag description explaining usage and scope. */
    description: string;

    /** Display color for visual categorization and highlighting. */
    color: string;

    /** Display ordering for consistent tag presentation. */
    sequence: number & tags.Type<"int32">;

    /** Tag visibility for public display and content organization. */
    visible: boolean;
  };
}
