import { tags } from "typia";

export namespace IDiscussionBoardTag {
  /**
   * Lightweight tag summary for list responses, providing essential information for display in tag clouds and filtering interfaces.
   */
  export type ISummary = {
    /**
     * Unique tag identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_tags.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Tag name used for content categorization and search.
     *
     * @x-autobe-database-schema-property tag_name
     * @x-autobe-specification Direct mapping from discussion_board_tags.tag_name. Unique tag name for content categorization.
     */
    tag_name: string;

    /**
     * Timestamp when this tag was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_tags.created_at. Timestamp when the tag was created.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for searching and filtering tags with pagination. Supports searching tags by name (partial match), sorting by article count or creation date, and paginating results.
   */
  export type IRequest = {
    /**
     * Search query for filtering tags by name (partial match, case-insensitive).
     *
     * @x-autobe-specification Query parameter for case-insensitive partial matching on tag_name. Minimum length: 2 characters, maximum: 100 characters.
     */
    search?: (string & tags.MinLength<2> & tags.MaxLength<100>) | undefined;

    /**
     * Sort field for ordering results (articleCount or createdAt).
     *
     * @x-autobe-specification Query parameter for sorting. articleCount sorts by article count descending, createdAt sorts by creation date descending.
     */
    sortBy?: "articleCount" | "createdAt" | undefined;

    /**
     * Page number for pagination (1-indexed, default: 10).
     *
     * @x-autobe-specification Query parameter for pagination page number. Minimum: 1, default: 10. Used for cursor-based pagination.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<10> & tags.Minimum<1>)
      | undefined;

    /**
     * Number of records per page (default: 10, max: 50).
     *
     * @x-autobe-specification Query parameter for pagination limit. Minimum: 1, maximum: 50, default: 10. Controls page size for cursor-based pagination.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<10> &
          tags.Minimum<1> &
          tags.Maximum<50>)
      | undefined;
  };

  /**
   * Tag statistics providing usage analytics including article counts and usage rates across the discussion board.
   */
  export type IStatistic = {
    /**
     * Unique identifier of the tag.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_tags.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Name of the tag for display purposes.
     *
     * @x-autobe-database-schema-property tag_name
     * @x-autobe-specification Direct mapping from discussion_board_tags.tag_name.
     */
    tagName: string;

    /**
     * Number of articles associated with this tag.
     *
     * @x-autobe-specification Aggregation: COUNT(*) of discussion_board_article_tags records for this tag.
     */
    articleCount: number & tags.Type<"int32">;

    /**
     * Percentage of total tag usage (0-100).
     *
     * @x-autobe-specification Aggregation: (tag_count / total_tags_count) * 100 calculated from discussion_board_article_tags.
     */
    usageRate: number;

    /**
     * Timestamp when the tag was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_tags.created_at.
     */
    createdAt: string & tags.Format<"date-time">;
  };
}
