export namespace IEconomicBoardSearchMetadata {
  /**
   * Parameters for performing a full-text search across economic board posts
   * with advanced filtering capabilities.
   *
   * This request object contains the search criteria used to query the index
   * tables (economic_board_search_index and economic_board_search_metadata)
   * and filter results by status and topic tags.
   *
   * Search terms are provided as a keyword string which is matched against
   * precomputed word vectors in the index. Filters allow refinement by post
   * status ('published', 'pending', 'rejected') and by economic topics
   * (categories) to return highly relevant results.
   *
   * This request object does not include pagination parameters as pagination
   * is handled at the interface layer via IPage wrapper. It also excludes any
   * actor identifiers, as search is a public operation.
   *
   * The actual keyword matching and relevance scoring are performed by the
   * search engine based on tokenized content and frequency data stored in
   * economic_board_search_index. Status and category filters are enforced in
   * the database using economic_board_search_metadata and
   * economic_board_search_tags.
   *
   * This request object is only used in the PATCH /economicBoard/search
   * endpoint which provides comprehensive search functionality in a single
   * request.
   *
   * Security: No authentication actor fields are included because search is a
   * public-facing operation accessible without login. No sensitive user data
   * can be queried through this endpoint.
   */
  export type IRequest = string;
}
