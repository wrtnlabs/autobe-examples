import { tags } from "typia";

export namespace IEconomicPoliticalBoardSectionPopularTag {
  /**
   * Lightweight summary DTO representing a tag's popularity within a specific section, containing the tag name and count of associated articles. This computed type is returned by the popular tags endpoint which aggregates tag usage statistics across all non-deleted articles in a section, sorted by usage count in descending order.
   */
  export type ISummary = {
    /**
     * The name of the tag being counted.
     *
     * @x-autobe-specification Computed from economic_political_board_tags.name column via JOIN with economic_political_board_article_tags and economic_political_board_articles. This string identifies the unique tag used across articles in the section.
     */
    tagName: string;

    /**
     * The number of articles in the specified section that are associated with this tag.
     *
     * @x-autobe-specification Computed COUNT aggregation: COUNT of articles from economic_political_board_articles joined with economic_political_board_article_tags where articles.section_id equals the requested section ID, filtered by articles.deleted_at IS NULL. This count represents the popularity of the tag within that specific section.
     */
    articleCount: number & tags.Type<"int32">;
  };
}
