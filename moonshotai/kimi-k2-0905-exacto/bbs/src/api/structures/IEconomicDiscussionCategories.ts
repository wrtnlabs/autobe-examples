import { tags } from "typia";

export namespace IEconomicDiscussionCategories {
  /**
   * Lightweight summary representation of discussion categories for content
   * organization and navigation.
   *
   * This variant provides essential category information for display contexts
   * where full category details are unnecessary. It includes core identity,
   * display preferences, and basic statistics while maintaining efficient
   * size for list rendering and filtering operations.
   *
   * The summary is optimized for embedding in articles as category attributes
   * and for efficient category browsing without loading detailed descriptions
   * or advanced configuration.
   */
  export type ISummary = {
    /** Cached count of articles */
    article_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Unique category code for programmatic identification */
    code: string;

    /** Numerical position for menu ordering */
    display_order: number & tags.Type<"int32">;

    /** Primary key identifier */
    id: string & tags.Format<"uuid">;

    /** Current visibility status */
    is_active: boolean;

    /** Display name shown to users in navigation */
    name: string;
  };
}
