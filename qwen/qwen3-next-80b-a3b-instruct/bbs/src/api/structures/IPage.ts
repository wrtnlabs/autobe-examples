export namespace IPage {
  /**
   * Pagination metadata included in paginated API responses.
   *
   * This schema defines the structure for pagination information that
   * accompanies the data elements in paginated responses. It provides context
   * about the result set and enables client-side navigation UIs (like page
   * numbers and previous/next buttons).
   *
   * Fields:
   *
   * - Total: Total number of items matching the search criteria
   * - Page: Current page number (1-based)
   * - Limit: Number of items per page (as requested)
   * - TotalPages: Total number of pages (calculated from total and limit)
   * - HasNext: Boolean indicating if another page exists after the current one
   * - HasPrev: Boolean indicating if a previous page exists before the current
   *   one
   *
   * Example Response: { "total": 247, "page": 3, "limit": 10, "totalPages":
   * 25, "hasNext": true, "hasPrev": true }
   *
   * This structure follows the standard pattern for RESTful API pagination
   * and enables client applications to build complete navigation interfaces
   * with minimal server interactions.
   */
  export type IPagination = string;
}
