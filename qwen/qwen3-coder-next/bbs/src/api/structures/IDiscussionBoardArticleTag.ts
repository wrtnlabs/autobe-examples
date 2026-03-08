import { tags } from "typia";

import { IDiscussionBoardArticle } from "./IDiscussionBoardArticle";

export namespace IDiscussionBoardArticleTag {
  /**
   * Lightweight summary of article-tag association showing when a tag was assigned to an article.
   */
  export type ISummary = {
    /**
     * Unique identifier for the article-tag association.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_article_tags.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when this tag was assigned to the article.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_article_tags.created_at. UTC timestamp when the tag was assigned.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * The article that this tag is associated with.
     *
     * @x-autobe-database-schema-property article
     * @x-autobe-specification Join from discussion_board_article_tags.article_id to discussion_board_articles.id. Returns ISummary.
     */
    article: IDiscussionBoardArticle.ISummary;
  };
}
