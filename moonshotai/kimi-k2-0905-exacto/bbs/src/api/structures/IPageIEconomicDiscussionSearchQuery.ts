import { tags } from "typia";

import { IEconomicDiscussionSearchQuery } from "./IEconomicDiscussionSearchQuery";

export namespace IPageIEconomicDiscussionSearchQuery {
  /**
   * Paginated collection of economic discussion search results with
   * comprehensive metadata enabling intelligent content discovery across the
   * economic and political discussion platform.
   */
  export type ISummary = {
    /**
     * Page information with mathematical foundation for search result
     * navigation including current position, total pages, records per page,
     * and overall count for content discovery workflows.
     */
    pagination: {
      /**
       * Current page number starting from 0 for the first page of search
       * results.
       */
      current: number & tags.Type<"int32"> & tags.Minimum<0>;

      /**
       * Total number of pages available for current search query based on
       * matching records and pagination settings.
       */
      pages: number & tags.Type<"int32"> & tags.Minimum<0>;

      /**
       * Number of search results returned per page, typically 1-50 for
       * optimal balance of performance and usability.
       */
      limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>;

      /**
       * Total count of all economic discussion articles and content
       * matching search criteria across the platform.
       */
      records: number & tags.Type<"int32"> & tags.Minimum<0>;
    };

    /**
     * Array of search result objects containing matching articles ranked by
     * relevance to user query terms. Results include article identifiers,
     * titles, category assignments, author information, moderation status,
     * engagement metrics, and creation timelines enabling efficient content
     * discovery and evaluation by users exploring economic and political
     * discussion content.
     */
    data: IEconomicDiscussionSearchQuery.ISummary[];
  };
}
