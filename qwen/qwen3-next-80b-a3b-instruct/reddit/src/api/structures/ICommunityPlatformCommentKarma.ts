export namespace ICommunityPlatformCommentKarma {
  /**
   * Search parameters including date ranges, karma thresholds, pagination,
   * sorting, and comment ID filters.
   *
   * This request body defines the criteria for filtering a user's comment
   * karma history. It enables complex queries on the
   * community_platform_comment_karma table using advanced search and
   * filtering capabilities.
   *
   * Unlike simple query parameters, this structure supports complex,
   * multi-dimensional filtering without URL length constraints, enabling
   * users to analyze vast amounts of karma data efficiently.
   *
   * All parameters are optional but allow users to conduct precision
   * investigations into their reputation history, such as finding comments
   * that received high positive impact, identifying negativity patterns, or
   * reviewing activity during specific time periods.
   *
   * Security: All search queries are automatically filtered by the
   * authenticated user's ID from the JWT token. Users cannot search other
   * users' comment karma records. This behavior is enforced at the database
   * layer through automatic WHERE clause on
   * community_platform_comment_karma.community_platform_member_id matching
   * the authenticated user's ID.
   *
   * All properties in this request body correspond directly to fields in the
   * community_platform_comment_karma table and its relationships, ensuring
   * type safety and alignment with the underlying database structure.
   */
  export type IRequest = string;
}
