import { tags } from "typia";

export namespace IRedditCommunityCategory {
  /**
   * Summary view of community categories for thematic organization and
   * content discovery.
   *
   * Categories provide hierarchical organization helping users discover
   * communities with similar themes and interests. Used for community
   * discovery, filtering, and platform-level content organization. Supports
   * administrative control over category presentation and availability
   * through sort_order and is_active fields.
   *
   * Essential fields include name and description for user presentation, with
   * sort_order enabling explicit control over category ordering in
   * interfaces. The is_active flag provides feature governance capabilities
   * for category lifecycle management.
   */
  export type ISummary = {
    /**
     * Unique identifier for the category. Primary key for category
     * reference and filtering.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Category name displayed to users. Human-readable identifier for
     * thematic grouping and navigation.
     */
    name: string;

    /**
     * Category overview explaining included community types. Helps users
     * understand what communities belong in this category.
     */
    description: string;

    /**
     * Display order for category sorting. Lower numbers appear first in
     * category listings and community discovery interfaces. Enables
     * administrative control over category presentation.
     */
    sort_order: number & tags.Type<"int32">;

    /**
     * Whether the category is active and available for assignment. Controls
     * category visibility in community creation and management workflows.
     * Essential for platform feature governance.
     */
    is_active: boolean;
  };
}
