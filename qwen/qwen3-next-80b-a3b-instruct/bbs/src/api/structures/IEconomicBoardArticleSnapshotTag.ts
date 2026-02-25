import { tags } from "typia";

export namespace IEconomicBoardArticleSnapshotTag {
  /**
   * Contains the normalized tag string and its creation timestamp recorded at the moment an article snapshot was taken. Used for auditing historical tag associations and ensuring consistent tag display in article version history.
   */
  export type ISummary = {
    /**
     * The human-readable, normalized tag string associated with this article snapshot (e.g., "economics", "democracy"). Represents the exact tag name as it appeared when the article was snapshot.
     *
     * @x-autobe-database-schema-property tag
     * @x-autobe-specification The normalized, lowercase string value from economic_board_tags.tag. Retrieved via JOIN on economic_board_article_snapshot_tags.economic_board_tag_id = economic_board_tags.id. Always non-null, trimmed, and case-normalized.
     */
    tag: string & tags.MinLength<1> & tags.MaxLength<50>;

    /**
     * The moment in time when this tag association was captured in the article snapshot. Indicates at what point in the article's history this tag was applied.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification The timestamp when this specific tag association was recorded in the snapshot, sourced directly from economic_board_article_snapshot_tags.created_at. Format: ISO 8601, timezone-agnostic UTC.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Pagination and filtering parameters for retrieving historical tags associated with an article snapshot. Allows clients to filter results by exact tag names and control the number of results per page.
   */
  export type IRequest = {
    /**
     * Array of tag strings to filter results. Only returns tag associations where the tag exactly matches one of these strings.
     *
     * @x-autobe-database-schema-property tag
     * @x-autobe-specification Filters tag associations by exact lowercase match against economic_board_tags.tag. Must be an array of strings where each string is a normalized tag from the master tag catalog. Case-sensitive comparison against stored tag values.
     */
    tag?: string[] | undefined;

    /**
     * The 1-based page number of results to return. Use this to navigate through large sets of tag associations.
     *
     * @x-autobe-specification 1-based page number for pagination. Client can request a specific page of results. Must be ≥ 1. Default is 1. Combined with limit to calculate OFFSET in SQL query.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Number of tag associations to return per page. Maximum value is 100. Default is 50.
     *
     * @x-autobe-specification Maximum number of tag associations to return per page. Must be between 1 and 100. Default is 50. Used with page parameter for OFFSET/LIMIT clause in database query. Enforced at database layer to prevent excessive results.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<50> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;
  };
}
