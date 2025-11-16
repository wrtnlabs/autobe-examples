import { tags } from "typia";

import { IEconomicDiscussionAttachment } from "./IEconomicDiscussionAttachment";

export namespace IPageIEconomicDiscussionAttachment {
  /**
   * Paginated collection of file attachment summaries for economic discussion
   * articles with complete metadata for file discovery and management across
   * the economic and political discussion platform.
   */
  export type ISummary = {
    /**
     * Page information containing current position, total pages, records
     * per page, and total count for efficient attachment browsing across
     * multiple articles.
     */
    pagination: {
      /**
       * Current page number starting from 0 for the first page of
       * attachment results.
       */
      current: number & tags.Type<"int32"> & tags.Minimum<0>;

      /**
       * Total number of pages available based on total attachment records
       * divided by pagination limit.
       */
      pages: number & tags.Type<"int32"> & tags.Minimum<0>;

      /**
       * Maximum number of attachments returned per page, typically 10-100
       * for optimal performance.
       */
      limit: number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>;

      /**
       * Total count of all file attachments matching current search
       * criteria across the platform.
       */
      records: number & tags.Type<"int32"> & tags.Minimum<0>;
    };

    /**
     * Array of attachment summary objects providing essential metadata for
     * each file without exposing actual content. Each summary includes
     * attachment identifier, relationship to parent article, filename, file
     * size, type category, and upload timestamp enabling efficient
     * attachment discovery and management workflows across the economic
     * discussion platform.
     */
    data: IEconomicDiscussionAttachment.ISummary[];
  };
}
