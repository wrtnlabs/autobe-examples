import { tags } from "typia";

export namespace IPage {
  /**
   * Standard pagination metadata used across all paginated API endpoints in
   * the system.
   *
   * This schema defines the consistent structure for pagination information
   * in every paginated response, ensuring a uniform experience across the API
   * and enabling client-side pagination implementations to work with every
   * endpoint.
   *
   * The properties provide complete information needed for UI pagination
   * controls:
   *
   * - Page: The current page being returned (1-based index)
   * - PageSize: The number of records per page (as requested or defaulted)
   * - Total: The total number of records available in the dataset
   * - TotalPages: The total number of pages (calculated from total records and
   *   page size)
   *
   * Clients can use this metadata to render navigation controls (e.g., 'Page
   * 3 of 25'), determine if next/previous buttons should be enabled, and
   * build infinite scroll indicators. This consistent structure eliminates
   * the need for endpoint-specific pagination handling in client
   * applications.
   */
  export type IPagination = {
    /**
     * The current page number in the paginated result set. Must be at least
     * 1.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * The number of records per page in the paginated result set. Must be
     * between 1 and 500.
     */
    pageSize: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<500>;

    /**
     * The total number of records available across all pages. Used to
     * calculate the total number of pages.
     */
    total: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * The total number of pages available based on total records and page
     * size. Calculated as ceil(total / pageSize).
     */
    totalPages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
