import { ISearchFilters } from "./ISearchFilters";
import { IPagination } from "./IPagination";

export namespace IShoppingMallGlobalSearch {
  /**
   * Global search criteria including search query, filters, and pagination
   * parameters for comprehensive shopping mall platform searches.
   *
   * This schema defines the request structure for performing comprehensive
   * searches across the entire shopping mall ecosystem. Users can search
   * across products, categories, customers, sellers, sales, orders, coupons,
   * promotions, articles, and reviews with advanced filtering capabilities.
   *
   * The search request supports text queries with partial matching, entity
   * type filtering, date ranges, price ranges, status filters, and pagination
   * controls to efficiently locate relevant information across the platform.
   * Results are categorized by entity type and include relevant metadata for
   * quick identification of matches.
   *
   * Security considerations ensure that search results are filtered based on
   * the user's authorization level, with appropriate access controls applied
   * to sensitive customer, seller, and order information. Administrative
   * users have access to comprehensive search results while customer users
   * see filtered results based on their permissions.
   *
   * The search functionality supports complex queries across multiple entity
   * types simultaneously, with relevance scoring and result ranking based on
   * match quality and entity relationships within the shopping mall
   * platform.
   */
  export type IRequest = {
    /**
     * Search query text to match against entity names, descriptions, and
     * other searchable fields across the shopping mall platform. Supports
     * partial matching, keyword searching, and fuzzy matching across
     * multiple entity types including products, categories, customers,
     * sellers, and content articles.
     *
     * Queries can include product names, category titles, customer names,
     * seller business names, article titles, and review content. The search
     * engine performs intelligent matching across all relevant fields with
     * relevance scoring for result ranking.
     *
     * Maximum query length is 500 characters to ensure optimal search
     * performance across the platform's extensive data set.
     */
    query: string;

    /**
     * Specific entity types to include in the search results across the
     * shopping mall platform. If empty, searches across all available
     * entity types with appropriate access controls based on user
     * authorization level.
     *
     * Each entity type represents a distinct category of searchable content
     * within the platform. The search engine will only return results from
     * the specified entity types, optimizing performance by excluding
     * irrelevant data sources.
     *
     * Administrative users can search across all entity types, while
     * customer users are restricted to product, category, article, and
     * review searches only for security and privacy compliance.
     */
    entityTypes?:
      | (
          | "products"
          | "categories"
          | "customers"
          | "sellers"
          | "sales"
          | "orders"
          | "coupons"
          | "promotions"
          | "articles"
          | "reviews"
        )[]
      | undefined;

    /**
     * Advanced filtering options to narrow down search results based on
     * specific criteria across the shopping mall platform.
     *
     * Provides comprehensive filtering capabilities including price ranges,
     * status values, date ranges, category filters, seller filters, and
     * other entity-specific criteria. Filters are applied after the initial
     * text search to refine the result set and improve search precision.
     *
     * Each filter type is optional and only entities matching all specified
     * filter criteria will be included in the final search results.
     * Multiple filters can be combined for highly specific search queries.
     */
    filters?: ISearchFilters | undefined;

    /**
     * Pagination parameters for controlling result set size and navigation
     * through large search result sets.
     *
     * Standard pagination controls including page number, page size, and
     * sorting options ensure efficient navigation through potentially
     * extensive search results. The system supports page sizes from 10 to
     * 100 results per page with optimal performance settings.
     *
     * Sorting options include relevance (default), alphabetical, date
     * created, price, and other entity-specific sorting criteria to
     * organize search results according to user preferences.
     */
    pagination: IPagination;
  };
}
