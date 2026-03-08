import { tags } from "typia";

import { IEconomicPoliticalBoardSection } from "./IEconomicPoliticalBoardSection";
import { IEconomicPoliticalBoardTag } from "./IEconomicPoliticalBoardTag";

export namespace IEconomicPoliticalBoardArticleTag {
  /**
   * Request parameters for retrieving paginated, filterable, and sortable unique tags associated with articles in a specific section.
   */
  export type IRequest = {
    /**
     * Tag name prefix for filtering results. Matches tags whose name starts with this value.
     *
     * @x-autobe-specification Filter tags by name prefix using LIKE operator: tag.name LIKE :namePattern (where :namePattern = name + '%'). Used to search tags by partial name match. Maximum 100 characters.
     */
    name?: (string & tags.MaxLength<100>) | undefined;

    /**
     * Current page number being viewed (1-indexed).
     *
     * @x-autobe-specification Current page number (1-indexed) for pagination. Defaults to 1. Used to calculate OFFSET: (page - 1) * limit. Page numbering starts from 1, not 0.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * @x-autobe-specification Maximum number of records per page. Defaults to 20. Range: 1-100. Used to limit the number of results returned in a single page.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Field to sort results by.
     *
     * @x-autobe-specification Field to sort results by. Options: 'name' (tag.name ASC/DESC), 'createdAt' (tag.created_at ASC/DESC), or 'articleCount' (COMPUTED COUNT of articles per tag ASC/DESC). Used in ORDER BY clause of the JOIN query.
     */
    sort?: "name" | "createdAt" | "articleCount" | undefined;

    /**
     * Sort direction: ASC for ascending, DESC for descending.
     *
     * @x-autobe-specification Sort direction. Options: 'ASC' (ascending) or 'DESC' (descending). Used in ORDER BY clause: ORDER BY {sort} {sortOrder}.
     */
    sortOrder?: "ASC" | "DESC" | undefined;
  };

  /**
   * Summary representation of a tag associated with articles in a specific section. Provides essential tag metadata, section context, and usage statistics for list views and tag clouds.
   */
  export type ISummary = {
    /**
     * Unique identifier for this section-tag association.
     *
     * @x-autobe-specification Composite identifier uniquely identifying the section+tag pairing. Generated from joining article_tags with sections and tags tables.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The section in which this tag is used.
     *
     * @x-autobe-specification Join from article_tags.section_id to sections.id. Returns IEconomicPoliticalBoardSection.ISummary for list views.
     */
    section: IEconomicPoliticalBoardSection.ISummary;

    /**
     * The tag associated with articles in this section.
     *
     * @x-autobe-specification Join from article_tags.tag_id to tags.id. Returns IEconomicPoliticalBoardTag.ISummary for list views.
     */
    tag: IEconomicPoliticalBoardTag.ISummary;

    /**
     * Number of articles in this section that use this tag.
     *
     * @x-autobe-specification Aggregation: COUNT(articles) WHERE articles.section_id = section.id AND articles.tag_id = tag.id AND articles.deleted_at IS NULL.
     */
    articleCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Timestamp when the first article with this tag was created in this section.
     *
     * @x-autobe-specification Aggregation: MIN(articles.created_at) WHERE articles.section_id = section.id AND articles.tag_id = tag.id AND articles.deleted_at IS NULL.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the last article with this tag was created in this section.
     *
     * @x-autobe-specification Aggregation: MAX(articles.created_at) WHERE articles.section_id = section.id AND articles.tag_id = tag.id AND articles.deleted_at IS NULL. Never null since section+tag pairing only exists when at least one article is present.
     */
    lastUsedAt: string & tags.Format<"date-time">;
  };
}
