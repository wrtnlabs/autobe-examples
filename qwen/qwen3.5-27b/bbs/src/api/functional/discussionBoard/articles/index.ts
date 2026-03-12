import { HttpError, IConnection } from "@nestia/fetcher";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia, { tags } from "typia";

import { IDiscussionBoardArticle } from "../../../structures/IDiscussionBoardArticle";
import { IPageIDiscussionBoardArticle } from "../../../structures/IPageIDiscussionBoardArticle";

export * as snapshots from "./snapshots/index";
export * as comments from "./comments/index";
export * as tags from "./tags/index";

/**
 * Retrieve a filtered and paginated list of articles from the discussion board platform.
 *
 * This operation provides comprehensive search and filtering capabilities for browsing articles. Users can filter articles by section, tags, author, creation date range, and perform full-text search on article titles and content. The response includes article summary information optimized for list displays, with pagination metadata for navigating large result sets.
 *
 * **Filtering Capabilities**:
 *
 * - **Section Filtering**: Filter articles by specific section ID to browse content within a particular topic category
 * - **Tag Filtering**: Filter by one or more tags (AND logic - articles must have all specified tags)
 * - **Author Filtering**: Filter articles by specific member ID to view content from a particular user
 * - **Text Search**: Full-text search across article titles and content using trigram similarity for partial matching
 * - **Date Range Filtering**: Filter articles by creation date range to find recent or historical content
 *
 * **Sorting Options**:
 *
 * - By creation date (newest or oldest first) - default is newest first
 * - By title alphabetically (ascending or descending)
 * - By last update date (most or least recently updated)
 *
 * **Access Control**:
 *
 * - **Guest users**: Can view all active articles (not soft-deleted) with public access
 * - **Member users**: Can view all active articles, with ability to filter by their own articles
 * - **Administrator users**: Can view all articles including soft-deleted ones when explicitly requested, with full filtering capabilities
 *
 * **Related Operations**:
 *
 * - `GET /discussionBoard/articles/{articleId}`: Retrieve detailed information for a specific article
 * - `POST /discussionBoard/articles`: Create a new article (requires member authentication)
 * - `PUT /discussionBoard/articles/{articleId}`: Update an existing article (requires ownership or admin access)
 * - `DELETE /discussionBoard/articles/{articleId}`: Delete an article (requires ownership or admin access)
 * - `PATCH /discussionBoard/sections`: List available sections for filtering
 * - `PATCH /discussionBoard/tags`: List available tags for filtering
 *
 * @param props.connection
 * @param props.body Search criteria, filters, and pagination parameters for article listing
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Query discussion_board_articles table with pagination and filtering.
 *
 * **Query Construction**:
 * 1. Base query selects active articles (deleted_at IS NULL) for non-admin users
 * 2. For administrators, include option to show soft-deleted articles via request parameter
 * 3. Apply section filter: JOIN discussion_board_sections, filter by section_id if provided
 * 4. Apply tag filter: JOIN discussion_board_article_tags and discussion_board_tags, filter by tag IDs (AND logic - must have all specified tags)
 * 5. Apply author filter: JOIN discussion_board_members, filter by member_id if provided
 * 6. Apply search filter: Use trigram similarity on title and content fields for partial matching
 * 7. Apply date range filter: Filter by created_at between provided dates
 * 8. Apply sorting: Default ORDER BY created_at DESC, support title ASC/DESC, updated_at ASC/DESC
 * 9. Apply pagination: Use cursor-based or offset-based pagination with configurable page size
 *
 * **Business Rules**:
 * - Exclude soft-deleted articles unless user is administrator and explicitly requests them
 * - Validate section_id references existing active section
 * - Validate tag_ids reference existing tags
 * - Validate author_id references existing member
 * - Search query minimum 2 characters, maximum 100 characters
 * - Page size limited to 100 maximum, default 20
 *
 * **Performance Considerations**:
 * - Use indexed fields: discussion_board_section_id, created_at, deleted_at
 * - Leverage GIN trigram indexes on title and content for search
 * - Use composite index on (discussion_board_section_id, created_at) for section filtering
 * - Cache tag lookups for repeated queries
 *
 * **Error Handling**:
 * - Return 400 for invalid search parameters (non-existent section, tag, author)
 * - Return 400 for page size exceeding maximum
 * - Return empty array for no matching results (not an error)
 * @path /discussionBoard/articles
 * @accessor api.functional.discussionBoard.articles.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Search criteria, filters, and pagination parameters for article listing
     */
    body: IDiscussionBoardArticle.IRequest;
  };
  export type Body = IDiscussionBoardArticle.IRequest;
  export type Response = IPageIDiscussionBoardArticle.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/discussionBoard/articles",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/discussionBoard/articles";
  export const random = (): IPageIDiscussionBoardArticle.ISummary =>
    typia.random<IPageIDiscussionBoardArticle.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve a single article by its unique identifier from the discussion board platform.
 *
 * This operation fetches the complete article content including title, full text, author information, section details, associated tags, and comment count. The article must exist and not be soft-deleted to be retrievable. All users including guests can view articles, supporting the platform's open browsing model.
 *
 * The response includes the article's creation and update timestamps, the section to which it belongs, the author's display name and bio, all tags assigned to the article, and the total count of comments. Articles are organized by sections for categorization, and each article must belong to exactly one active section.
 *
 * Related operations include listing articles in a section (PATCH /sections/{sectionId}/articles), searching articles (PATCH /articles), viewing article comments (GET /articles/{articleId}/comments), and retrieving section information (GET /sections/{sectionId}).
 *
 * @param props.connection
 * @param props.articleId Unique identifier of the article to retrieve
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Query the discussion_board_articles table for a single record by UUID where deleted_at IS NULL.
 *
 * Join with discussion_board_sections to retrieve section name and description.
 * Join with discussion_board_members to retrieve author's display_name and bio.
 * Join with discussion_board_article_tags and discussion_board_tags to retrieve all associated tag names.
 * Count associated records in discussion_board_comments where deleted_at IS NULL.
 *
 * Validation:
 * - Verify articleId is a valid UUID format
 * - Verify the article exists and is not soft-deleted
 * - Return 404 if article not found or deleted
 *
 * Authorization:
 * - Allow access to all actor types (guest, member, administrator)
 * - No write permissions required
 *
 * Return the article with full content, section details, author information, tags array, and comment count.
 * @path /discussionBoard/articles/:articleId
 * @accessor api.functional.discussionBoard.articles.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Unique identifier of the article to retrieve
     */
    articleId: string & tags.Format<"uuid">;
  };
  export type Response = IDiscussionBoardArticle;

  export const METADATA = {
    method: "GET",
    path: "/discussionBoard/articles/:articleId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/discussionBoard/articles/${encodeURIComponent(props.articleId ?? "null")}`;
  export const random = (): IDiscussionBoardArticle =>
    typia.random<IDiscussionBoardArticle>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("articleId")(() => typia.assert(props.articleId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
