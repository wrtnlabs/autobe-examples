import { tags } from "typia";

export namespace IShoppingMallGlobalSearch {
  /**
   * Global search request parameters for comprehensive cross-domain search
   * functionality that provides unified discovery capabilities for
   * marketplace users. This request enables sophisticated cross-domain search
   * accessing multiple data sources including products, articles, FAQ
   * entries, and help documentation with intelligent ranking based on user
   * behavior patterns, content freshness, and relevance scoring.
   *
   * The search request supports multiple content types with configurable
   * filtering capabilities including category restrictions, date ranges,
   * content type preferences, and result quantity controls. Users can
   * discover products through text matching against product names,
   * descriptions, and specifications, access help documentation and FAQ
   * answers, find platform articles and announcements, and locate relevant
   * educational content.
   *
   * Performance considerations include GIN index utilization for text search
   * acceleration, result caching mechanisms for popular queries, and
   * intelligent autocomplete integration to improve user experience. The
   * request serves both authenticated customers seeking products and guest
   * visitors exploring platform resources, with potential personalized result
   * ordering for recognized users.
   */
  export type IRequest = {
    /**
     * Search query text containing the terms to match against products,
     * articles, FAQ entries, and help documentation
     */
    query: string;

    /**
     * Array of content types to include in search results (products,
     * articles, faq, help), or null to search all types
     */
    content_types?:
      | ("products" | "articles" | "faq" | "help")[]
      | null
      | undefined;

    /**
     * Optional category identifier to restrict search results to specific
     * product or content categories
     */
    category_filter?: string | undefined;

    /**
     * Optional date range filter in format 'YYYY-MM-DD..YYYY-MM-DD' to
     * restrict results by creation or update date
     */
    date_range?: string | undefined;

    /** Optional minimum price filter for product search results in USD */
    min_price?: (number & tags.Minimum<0>) | undefined;

    /** Optional maximum price filter for product search results in USD */
    max_price?: (number & tags.Minimum<0>) | undefined;

    /**
     * Result ordering preference based on relevance scoring, date, price,
     * or popularity metrics
     */
    sort_order:
      | "relevance"
      | "date"
      | "price_asc"
      | "price_desc"
      | "popularity";

    /** Page number for paginated search results, starting from 1 */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of results per page for paginated search results, capped at
     * 100
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Flag to include archived or deleted content in search results,
     * defaults to false
     */
    include_archived?: boolean | undefined;

    /**
     * Array of user preference tags to influence search result ranking and
     * personalization
     */
    user_preferences?: string[] | undefined;

    /**
     * Array of specific field names to search within for more targeted
     * results, or null to search all fields
     */
    search_fields?: string[] | null | undefined;
  };
}
