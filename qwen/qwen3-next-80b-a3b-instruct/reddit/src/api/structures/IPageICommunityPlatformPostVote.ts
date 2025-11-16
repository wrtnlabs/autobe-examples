export namespace IPageICommunityPlatformPostVote {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   *
   * This schema represents a paginated response for post votes. It contains
   * pagination metadata and a list of individual vote summary records.
   *
   * The `data` property contains the array of
   * ICommunityPlatformPostVote.ISummary objects, each representing a single
   * vote record with minimal identifying information. This allows efficient
   * display of vote lists in UI dashboards while avoiding data duplication.
   *
   * This schema does not directly correspond to a database table but is a
   * compound response structure used for API pagination. It references the
   * ICommunityPlatformPostVote.ISummary schema for its data items.
   */
  export type ISummary = string;
}
