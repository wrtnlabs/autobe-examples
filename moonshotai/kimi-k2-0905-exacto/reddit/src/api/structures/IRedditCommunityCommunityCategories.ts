import { tags } from "typia";

export namespace IRedditCommunityCommunityCategories {
  /**
   * Lightweight representation of community categories optimized for
   * efficient list views and cross-referencing throughout the platform.
   *
   * Provides essential category information for community organization and
   * discovery purposes while excluding detailed configuration and
   * relationship data that belongs in full detail views. Enables efficient
   * rendering in community listings, categorization interfaces, and
   * navigation elements.
   *
   * This summary variant is specifically designed for scenarios requiring
   * basic category context without the overhead of complete category
   * metadata, supporting responsive UI performance and mobile-friendly data
   * transfer.
   */
  export type ISummary = {
    /**
     * Primary key identifying the community category with UUID v4 format
     * for unique identification across the platform
     */
    id: string & tags.Format<"uuid">;

    /**
     * Category name displayed to users for thematic organization and
     * community discovery. Used consistently across the platform for
     * categorizing communities by topic or theme
     */
    name: string;

    /**
     * Category description explaining the types of communities included
     * within this thematic grouping. Helps users understand community scope
     * and content focus when browsing or creating new communities
     */
    description: string;

    /**
     * Display order for category sorting with lower numbers appearing first
     * in UI listings. Enables administrators to control category
     * presentation hierarchy and prioritize popular or important
     * categories
     */
    sort_order: number & tags.Type<"int32">;

    /**
     * Whether the category is active and available for assignment to new
     * communities. Controls category visibility in community creation forms
     * and search filters
     */
    is_active: boolean;

    /**
     * Category creation timestamp in ISO 8601 format. Records when the
     * category was first established for audit and administrative tracking
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last modification timestamp in ISO 8601 format. Tracks when category
     * properties were last changed for administrative audit purposes
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
