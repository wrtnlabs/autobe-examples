export namespace ICommunityBbsSearch {
  /**
   * Search request payload with query string, optional filters (entity types,
   * community, time window), cursor and page size. When both 'cursor' and
   * 'page' are supplied server will prefer 'cursor'.
   */
  export type IRequest = any;
}
