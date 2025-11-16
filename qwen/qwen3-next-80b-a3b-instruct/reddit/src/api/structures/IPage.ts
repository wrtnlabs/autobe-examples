import { tags } from "typia";

export namespace IPage {
  /**
   * Pagination metadata for paginated responses.
   *
   * Provides complete information for navigating paginated data, including
   * current position, total resources, and navigation controls.
   *
   * When a response contains paginated data, this object must be included to
   * enable client-side navigation and rendering.
   *
   * All properties are required for full pagination functionality.
   */
  export type IPagination = {
    /** The current page number (1-indexed). */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /** The number of items per page. */
    perPage: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /** The total number of items available across all pages. */
    totalItems: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** The total number of pages available based on the items per page. */
    totalPages: number & tags.Type<"int32"> & tags.Minimum<1>;

    /** Indicates whether there is a next page available. */
    hasNext: boolean;

    /** Indicates whether there is a previous page available. */
    hasPrev: boolean;
  };
}
