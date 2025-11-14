import { tags } from "typia";

import { ICommunityPlatformPost } from "./ICommunityPlatformPost";

export namespace IPageICommunityPlatformPost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   *
   * This schema represents a paginated response containing a list of post
   * summary information as defined by the ICommunityPlatformPost.ISummary
   * type. It provides a structured container that includes pagination
   * metadata along with the array of post summaries. This pattern is
   * consistent across the API for all list-style responses to provide
   * predictable structure, enable client-side pagination controls, and
   * support efficient data transfer.
   *
   * The pagination property contains information about current page, page
   * limit, total records, and total pages to allow for consistent client
   * navigation. The data property contains the actual array of post summary
   * objects. This design follows the OpenAPI specification pattern for paged
   * responses and is used by multiple endpoints including search, hot, top,
   * and new post statistics.
   *
   * The IPageICommunityPlatformPost.ISummary schema ensures uniformity across
   * the platform's API responses and enables client applications to implement
   * consistent pagination controls regardless of the specific data type being
   * retrieved.
   *
   * Note: This is a patterned response schema and should not be confused with
   * the single-object ICommunityPlatformPost.ISummary type that represents
   * individual post data.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the paged response.
     *
     * This object contains all the information needed by clients to
     * implement full pagination controls.
     *
     * It includes:
     *
     * - The current page being returned (currentPage)
     * - The number of items per page (limit)
     * - The total number of records available (totalRecords)
     * - The total number of pages possible (totalPages)
     *
     * These values work together to enable clients to offer full pagination
     * navigation including:
     *
     * - First/previous/next/last page buttons
     * - Page number selectors
     * - "Page X of Y" display
     * - Determining when to disable navigation controls
     *
     * The pagination object ensures consistent user experience across all
     * paged endpoints in the API.
     */
    pagination: {
      /**
       * The current page number being returned. Must be a positive
       * integer starting from 1.
       *
       * This indicates which chunk of results the client is currently
       * viewing.
       *
       * - Page 1 returns the first set of results
       * - Each page contains a defined number of records based on the
       *   pagination limit
       * - Values less than 1 are invalid and will be rejected
       *
       * This parameter enables clients to navigate through multi-page
       * results with consistent UI controls.
       */
      currentPage: number & tags.Type<"int32"> & tags.Minimum<1>;

      /**
       * The number of records returned per page.
       *
       * This controls the size of each pagination chunk.
       *
       * - Minimum value is 1 - at least one record must be returned per
       *   page
       * - Maximum value is 100 - to prevent excessively large responses
       *   that could impact performance
       * - Values outside this range will be rejected by the system
       * - The default value is typically 25, but clients can specify any
       *   value within the allowed range
       *
       * This provides flexibility in pagination size while ensuring
       * operational efficiency by capping maximum response sizes.
       */
      limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

      /**
       * The total number of records available across all pages.
       *
       * This represents the complete count of matching records before
       * pagination was applied.
       *
       * - Enables clients to calculate total number of pages (totalRecords
       *   / limit)
       * - Helps determine if additional pages exist (totalRecords >
       *   currentPage * limit)
       * - Used in UI pagination controls to show "Page X of Y" information
       * - Must be accurate and updated whenever underlying data changes
       *
       * This field allows clients to implement complete pagination
       * navigation including "last page" functionality.
       */
      totalRecords: number & tags.Type<"int32"> & tags.Minimum<0>;

      /**
       * The total number of pages available based on the total records
       * and limit.
       *
       * This is calculated as ceil(totalRecords / limit) and represents
       * the maximum page number.
       *
       * - Allows clients to determine the last page of results
       * - Enables "Jump to last page" functionality in UI
       * - Must be coordinated with totalRecords and limit values
       * - Must be an integer (no fractional pages)
       *
       * This field enables comprehensive pagination UI controls including
       * navigation to the final page.
       */
      totalPages: number & tags.Type<"int32"> & tags.Minimum<0>;
    };

    /**
     * Array of post summary objects returned in the current page.
     *
     * This property contains the actual list of posts that match the search
     * criteria, limited to the requested page size.
     *
     * - Each item in the array is an object representing a single post
     *   summary, following the ICommunityPlatformPost.ISummary schema
     * - These are lightweight representations of posts designed for display
     *   in lists
     * - Contains only essential information needed for list views (not full
     *   post details)
     * - Omitted properties include full content, detailed metadata, and
     *   related entities
     *
     * The data array is the core payload of this response, with pagination
     * serving as structural metadata about the collection.
     *
     * Note: The pagination and data properties must both be present in
     * every response for this schema.
     */
    data: ICommunityPlatformPost.ISummary[];
  };
}
