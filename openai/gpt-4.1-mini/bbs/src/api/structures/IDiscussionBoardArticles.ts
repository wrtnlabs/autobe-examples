import { tags } from "typia";

export namespace IDiscussionBoardArticles {
  /**
   * Request body schema for searching and filtering discussion board
   * articles.
   *
   * Includes pagination parameters, search keywords, sorting options, and
   * filters by author or categories.
   *
   * Used in POST /discussionBoard/member/discussionBoardArticles (PATCH
   * method) to retrieve filtered article lists.
   */
  export type IRequest = {
    /** Page number for pagination; starting at 1. */
    page: number & tags.Type<"int32">;

    /** Maximum number of articles to retrieve per page. */
    limit: number & tags.Type<"int32">;

    /**
     * Full-text search query to find articles containing the specified
     * keywords.
     */
    search?: string | undefined;

    /** Field by which to sort the articles, e.g., 'created_at', 'title'. */
    sortBy?: string | undefined;

    /** Direction of sorting: ascending or descending. */
    sortDirection?: "asc" | "desc" | undefined;

    /** Filter articles authored by the specified member ID. */
    authorId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * List of category IDs to filter articles belonging to these
     * categories.
     */
    categoryIds?: (string & tags.Format<"uuid">)[] | undefined;
  };

  /**
   * Summary representation of a discussion board article.
   *
   * Provides key details such as unique article identifier, title, author
   * reference, and timestamps for creation and modification.
   *
   * Excludes large content fields for performance optimization in list views.
   */
  export type ISummary = {
    [key: string]: false;
  };
}
