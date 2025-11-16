import { tags } from "typia";

import { IEconomicDiscussionSortOrder } from "./IEconomicDiscussionSortOrder";

export namespace IEconomicDiscussionRecentlyViewed {
  /**
   * Query parameters for filtering and paginating recently viewed articles on
   * the Economic Discussion Board platform. This request object enables users
   * to browse their viewing history with flexible filtering options including
   * date ranges, sorting preferences, and pagination controls. Search
   * parameters support both filtering by time periods and pagination with
   * configurable limits to optimize server performance and user experience.
   * The request structure supports complex time-based queries while
   * maintaining backward compatibility through default values.
   */
  export type IRequest = {
    /**
     * Page number for pagination results. Valid values are positive
     * integers starting from 1. User can request multiple pages of recent
     * viewing history data for browsing through their reading history over
     * time.
     */
    page: number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>;

    /**
     * Number of items per page for pagination. Valid range is 1-100 for
     * performance optimization. Controls how many recently viewed articles
     * appear in each response page to balance between server load and user
     * convenience.
     */
    limit: number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>;

    /**
     * Sort direction for recently viewed articles. 'desc' shows most recent
     * views first, 'asc' shows oldest views first based on viewing
     * timestamp. This controls chronological ordering of viewing history
     * results for user preference and analysis needs.
     */
    sort_order: IEconomicDiscussionSortOrder;

    /**
     * Filter articles viewed on or after this timestamp. Use ISO 8601
     * format for date-time values. Helps users narrow results to specific
     * time periods and analyze their reading patterns over specific date
     * ranges.
     */
    date_from: (string & tags.Format<"date-time">) | null;

    /**
     * Filter articles viewed on or before this timestamp. Use ISO 8601
     * format for date-time values. Enables date range filtering for viewing
     * history analysis and retrospective content exploration.
     */
    date_to: (string & tags.Format<"date-time">) | null;

    /**
     * Include articles that have been soft-deleted. Default is false to
     * exclude deleted content. Use with caution as deleted articles may not
     * be accessible through normal interfaces and could affect content
     * discovery experience.
     */
    include_deleted: boolean;
  };
}
