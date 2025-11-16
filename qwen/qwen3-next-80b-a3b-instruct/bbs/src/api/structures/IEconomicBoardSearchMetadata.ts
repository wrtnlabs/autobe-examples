export namespace IEconomicBoardSearchMetadata {
  /**
   * Search criteria for querying economic board posts using keywords and
   * filters. This request object is used in the PATCH /economicBoard/search
   * operation to specify search parameters like keywords, status filters,
   * category restrictions, date range, sorting preferences, and pagination
   * controls. Values are applied to the indexed
   * economic_board_search_metadata table for fast, high-performance searching
   * without impacting transactional performance.
   */
  export type IRequest = string;
}
