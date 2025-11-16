import { IEconomicDiscussionCategory } from "./IEconomicDiscussionCategory";
import { IPage } from "./IPage";

export namespace IPageIEconomicDiscussionCategory {
  /**
   * Paginated collection of economic discussion board categories optimized
   * for browsing and navigation.
   *
   * This pagination schema serves as the standardized response format for
   * category listing endpoints, providing efficient access to discussion
   * topic organization data. The structure enables users to navigate through
   * available economic and political discussion categories with comprehensive
   * pagination metadata and category summaries.
   *
   * The schema integrates with the economic_discussion_categories table to
   * deliver category data with performance-optimized summary information.
   * Each category summary includes essential metadata for content discovery,
   * navigation display, and topic organization within the discussion
   * platform.
   *
   * Pagination metadata provides complete browsing context including current
   * page position, total available pages, result limits, and total record
   * counts. This enables sophisticated pagination interfaces while
   * maintaining consistent API performance across varying category dataset
   * sizes.
   */
  export type ISummary = {
    /**
     * Collection of economic discussion category summaries for browse and
     * navigation interfaces. Each summary provides essential category
     * information including display properties, article counts, and
     * activity status for efficient content organization and topic
     * discovery within the platform.
     */
    data: IEconomicDiscussionCategory.ISummary[];

    /**
     * Comprehensive pagination metadata for category browsing navigation.
     * Provides current page position, total page count, result limits per
     * page, and total record count enabling sophisticated pagination
     * controls and user experience optimization across category discovery
     * workflows.
     */
    pagination: IPage.IPagination;
  };
}
