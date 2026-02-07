export namespace ICommunityMvCommunityPopularFeed {
  /**
   * A single post entry in the popular feed, containing all publicly visible summary data. Includes post title, author, community, vote score, comment count, and content previews. For link posts: includes domain name; for image posts: includes thumbnail URL. Designed for efficient feed rendering with minimal payload size and no nested relationships.
   */
  export type ISummary = {};

  /**
   * Parameters for retrieving the popular community feed. Specifies the sorting algorithm, pagination cursor, and month-based partition for efficient cache access and performance optimization.
   */
  export type IRequest = {};
}
