import { tags } from "typia";

export namespace ICommunityPlatformCommunityCategory {
  /**
   * Summary view of community platform category information optimized for
   * efficient list displays and selection interfaces.
   *
   * Provides essential category details for dropdown menus, filtering
   * operations, and quick reference contexts. Used when displaying categories
   * in community creation forms, content classification interfaces, and
   * administrative tools where full category details are not required.
   *
   * Contains streamlined information focused on category identification,
   * basic metadata, and operational status. The summary balances
   * comprehensive category representation with performance considerations for
   * high-frequency listing operations across the platform.
   */
  export type ISummary = {
    /**
     * Primary identifier for the category automatically generated using
     * UUID v4 format. Serves as the unique key for category-related
     * operations and relationships throughout the platform ecosystem.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique name identifier for the category used in URLs, APIs, and
     * internal references. Must follow platform naming conventions and be
     * distinct across all categories for proper content classification.
     */
    name: string;

    /**
     * Human-readable display name for the category shown to users in
     * interfaces and selection menus. Provides user-friendly representation
     * while maintaining consistency with the technical name identifier.
     */
    display_name: string;

    /**
     * URL-friendly identifier for the category used in navigation paths and
     * API endpoints. Must be unique across all categories and follow
     * web-safe character conventions for reliable routing.
     */
    slug: string;

    /**
     * Detailed description explaining the category's purpose, content
     * scope, and intended usage within the platform. Helps users understand
     * what type of content belongs in this classification.
     */
    description: string;

    /**
     * URL to the category's icon image used for visual representation in
     * user interfaces. Optional field that enhances category recognition
     * and user experience when available.
     */
    icon_url?: (string & tags.Format<"uri">) | undefined;

    /**
     * Hex color code for visual identification and theming of the category
     * across platform interfaces. Optional field that supports consistent
     * branding and visual hierarchy.
     */
    color_hex?: string | undefined;

    /**
     * Numerical order value for sorting categories in selection menus and
     * display lists. Lower numbers appear first, with categories typically
     * ordered by relevance or alphabetical sequence.
     */
    sort_order: number & tags.Type<"int32">;

    /**
     * Boolean indicator showing whether the category is currently active
     * and available for content classification. Inactive categories are
     * hidden from user selection but preserved for historical reference.
     */
    is_active: boolean;

    /**
     * Current workflow status of the category determining its availability
     * and management state. Draft categories are in preparation, active
     * categories are operational, archived categories are preserved
     * read-only, and suspended categories are temporarily disabled.
     */
    status: "draft" | "active" | "archived" | "suspended";

    /**
     * Timestamp indicating when the category was originally created in the
     * platform system. Used for auditing, sorting by creation date, and
     * tracking category lifecycle.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp indicating when the category was last updated with new
     * information or configuration changes. Used for tracking modifications
     * and displaying recent activity.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
