import { tags } from "typia";

import { ICommunityPlatformCreatorMonetizationApplication } from "./ICommunityPlatformCreatorMonetizationApplication";

export namespace IPageICommunityPlatformCreatorMonetizationApplication {
  /**
   * A page of creator monetization application summary information.
   *
   * Full pagination structure for a collection of creator monetization
   * application records, including current page number, records per page,
   * total record count, and the actual data array.
   *
   * All application summary records are returned in the response as a
   * paginated result set with detailed pagination metadata.
   *
   * This structure follows the standard pagination pattern used throughout
   * the Community Platform API, ensuring consistent client experience.
   *
   * Key components:
   *
   * - Page: What page of data is being returned
   * - PerPage: How many items per page are configured
   * - Total: The total count of all items matching the criteria (across all
   *   pages)
   * - Data: The list of application summary objects for the current page
   *
   * Example usage: A client requests page 2 with per_page=10, and receives a
   * response with page=2, perPage=10, total=23, data=[10 application summary
   * objects].
   */
  export type ISummary = {
    /**
     * The current page number of the results.
     *
     * Indicates which page of data is being returned in this response.
     *
     * Page numbering starts at 1 and increments by 1 for each subsequent
     * page.
     *
     * This property helps clients track their position in the paginated
     * result set.
     *
     * Example: 1
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * The number of items returned per page.
     *
     * Defines the size of each page in the paginated response.
     *
     * This value may be set by the client via the per_page query parameter
     * when making the request, or it may be set to a default value by the
     * server.
     *
     * Valid values: 1-100 (inclusive)
     *
     * Example: 25
     */
    perPage: number &
      tags.Type<"int32"> &
      tags.Default<25> &
      tags.Minimum<1> &
      tags.Maximum<100>;

    /**
     * The total number of items across all pages.
     *
     * Represents the complete count of available items matching the search
     * criteria.
     *
     * This allows clients to calculate the total number of pages (total /
     * perPage) and determine if additional pages exist.
     *
     * Example: 157
     */
    total: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * The array of creator monetization application summary objects
     * returned in the current page.
     *
     * Contains the actual application records filtered and sorted according
     * to the request parameters.
     *
     * Each item in this array represents a single creator monetization
     * application with essential information for display in a list view.
     *
     * Example: [{ "id": "app-001", "applicantId": "member-789", "status":
     * "pending", "submittedAt": "2024-01-15T10:30:00Z" }, ...]
     */
    data: ICommunityPlatformCreatorMonetizationApplication.ISummary[];
  };
}
