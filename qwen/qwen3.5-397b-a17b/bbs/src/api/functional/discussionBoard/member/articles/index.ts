import { HttpError, IConnection } from "@nestia/fetcher";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia, { tags } from "typia";

import { IDiscussionBoardArticle } from "../../../../structures/IDiscussionBoardArticle";
import { IPageIDiscussionBoardArticle } from "../../../../structures/IPageIDiscussionBoardArticle";

export * as comments from "./comments/index";
export * as files from "./files/index";
export * as images from "./images/index";

/**
 * Create a new discussion board article with title, content, section assignment, and optional attachments.
 *
 * This operation enables authenticated members to create articles within the discussion board system. Each article must be assigned to exactly one section for topic organization and categorization. The article serves as the foundation for community discussion and debate on various topics.
 *
 * The creation process supports multiple file attachments and image attachments through URI references. File attachments store metadata including original filename, MIME type, and file size for proper download handling. Image attachments include dimension information (width and height) for optimal display rendering.
 *
 * Tags can be assigned to articles for improved discoverability and content organization. The system automatically creates new tags if they don't exist, or reuses existing tags with matching names. This enables efficient tag-based filtering and search functionality across the platform.
 *
 * Only authenticated members can create articles. Guest users must register and log in before accessing this endpoint. The article author is automatically set to the authenticated member's ID from the session context.
 *
 * Upon successful creation, the article is immediately visible in the section's article list. The operation returns the complete article entity including all metadata, attachment information, and tag assignments.
 *
 * @param props.connection
 * @param props.body Article creation data including required title, content, section assignment, and optional file attachments, image attachments, and tags
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Create a new article record in discussion_board_articles table with the following steps:
 *
 * 1. Validate authentication: Ensure request is from authenticated member (discussion_board_members). Reject guest users with 401 Unauthorized.
 *
 * 2. Validate section existence: Query discussion_board_sections by provided sectionId. Return 404 Not Found if section doesn't exist or is soft-deleted (deleted_at is not null).
 *
 * 3. Validate required fields:
 *    - title: non-empty string, minimum 1 character, maximum 200 characters
 *    - content: non-empty string, minimum 1 character, maximum 100000 characters
 *    - sectionId: valid UUID format
 *
 * 4. Validate optional attachments:
 *    - fileUrls: array of valid URI strings (string & tags.Format<"uri">)
 *    - imageUrls: array of valid URI strings (string & tags.Format<"uri">)
 *    - tags: array of non-empty strings, deduplicate before processing
 *
 * 5. Create article record:
 *    - Generate new UUID for article id
 *    - Set discussion_board_section_id from request
 *    - Set discussion_board_member_id from authenticated session
 *    - Set title and content from request
 *    - Set created_at and updated_at to current timestamp
 *    - Set deleted_at to null
 *
 * 6. Process file attachments (if fileUrls provided):
 *    - For each file URL, create discussion_board_article_files record
 *    - Extract filename from URL or use provided metadata
 *    - Set discussion_board_article_id to new article's id
 *    - Set discussion_board_member_id from session
 *    - Set created_at and updated_at to current timestamp
 *
 * 7. Process image attachments (if imageUrls provided):
 *    - For each image URL, create discussion_board_article_images record
 *    - Extract or compute image dimensions (width, height)
 *    - Set discussion_board_article_id to new article's id
 *    - Set created_at and updated_at to current timestamp
 *
 * 8. Process tags:
 *    - For each unique tag name:
 *      a. Query discussion_board_tags by name (case-insensitive)
 *      b. If exists, use existing tag id
 *      c. If not exists, create new tag with generated UUID and current timestamp
 *      d. Create discussion_board_article_tags record linking article and tag
 *
 * 9. Return complete article entity with all relationships loaded:
 *    - Article base fields (id, title, content, timestamps)
 *    - Section information (joined from discussion_board_sections)
 *    - Author information (joined from discussion_board_members)
 *    - File attachments array (from discussion_board_article_files)
 *    - Image attachments array (from discussion_board_article_images)
 *    - Tags array (joined through discussion_board_article_tags to discussion_board_tags)
 *
 * Transaction boundary: Steps 5-8 must execute within a single database transaction. If any step fails, rollback all changes to maintain data consistency.
 *
 * Error handling:
 * - 401 Unauthorized: User not authenticated as member
 * - 404 Not Found: Section not found or deleted
 * - 400 Bad Request: Validation errors (missing required fields, invalid formats)
 * - 500 Internal Server Error: Database transaction failure
 * @path /discussionBoard/member/articles
 * @accessor api.functional.discussionBoard.member.articles.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Article creation data including required title, content, section assignment, and optional file attachments, image attachments, and tags
     */
    body: IDiscussionBoardArticle.ICreate;
  };
  export type Body = IDiscussionBoardArticle.ICreate;
  export type Response = IDiscussionBoardArticle;

  export const METADATA = {
    method: "POST",
    path: "/discussionBoard/member/articles",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/discussionBoard/member/articles";
  export const random = (): IDiscussionBoardArticle =>
    typia.random<IDiscussionBoardArticle>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
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
 * Update an existing article's content, title, section assignment, and metadata.
 *
 * This operation allows the article's author to modify their article's title, content text, and section assignment. The article must exist and be owned by the requesting user. Administrators can also update any article for moderation purposes.
 *
 * The update operation replaces the article's title, content, and section fields with the provided values. Attachments (files and images) and tags are managed through separate child endpoints - this operation focuses on the core article properties. The updated_at timestamp is automatically updated to reflect the modification time.
 *
 * Authorization requires the user to be either the article's author (discussion_board_member_id matches authenticated user) or an administrator with elevated permissions. Banned users cannot update articles. If the article has been soft deleted (deleted_at is set), the update will be rejected.
 *
 * Related operations: GET /articles/{articleId} retrieves the article before editing. PATCH /articles supports search and filtering. POST /articles creates new articles. DELETE /articles/{articleId} removes an article.
 *
 * @param props.connection
 * @param props.articleId Target article's ID (UUID format)
 * @param props.body Update payload with article fields to modify
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Query discussion_board_articles table by articleId UUID. Verify the article exists and is not soft deleted (deleted_at is null). Check authorization: authenticated user must match discussion_board_member_id OR have administrator role. Validate title is non-empty and within length constraints. Validate content is non-empty and within length constraints. Validate discussion_board_section_id references an existing, non-deleted section. Update title, content, discussion_board_section_id, and updated_at timestamp in a single transaction. Return the updated article entity with all fields. Handle concurrent update conflicts using optimistic locking on updated_at. Reject if article is soft deleted or user lacks permission.
 * @path /discussionBoard/member/articles/:articleId
 * @accessor api.functional.discussionBoard.member.articles.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Target article's ID (UUID format)
     */
    articleId: string & tags.Format<"uuid">;

    /**
     * Update payload with article fields to modify
     */
    body: IDiscussionBoardArticle.IUpdate;
  };
  export type Body = IDiscussionBoardArticle.IUpdate;
  export type Response = IDiscussionBoardArticle;

  export const METADATA = {
    method: "PUT",
    path: "/discussionBoard/member/articles/:articleId",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/discussionBoard/member/articles/${encodeURIComponent(props.articleId ?? "null")}`;
  export const random = (): IDiscussionBoardArticle =>
    typia.random<IDiscussionBoardArticle>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("articleId")(() => typia.assert(props.articleId));
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
 * Soft delete an article by marking it as deleted in the discussion board.
 *
 * This operation sets the deleted_at timestamp on the article record, marking it as deleted while maintaining the data for audit trail compliance. The soft delete triggers cascade deletion of all associated child entities including file attachments, image attachments, tag assignments, and comments.
 *
 * Only the article's author (owner) or administrators can delete an article. Regular users attempting to delete articles they don't own will receive an authorization error. Administrators can delete any article for moderation purposes regardless of ownership.
 *
 * When an article is soft deleted, the deleted_at timestamp is populated and all related discussion_board_article_files, discussion_board_article_images, discussion_board_article_tags, and discussion_board_comments records are cascade deleted through database foreign key constraints. The article record remains in the database with the deleted_at timestamp set, enabling audit tracking and compliance with data retention requirements.
 *
 * This operation is irreversible through the API. Once the deleted_at timestamp is set, the article and all its associated content cannot be recovered.
 *
 * @param props.connection
 * @param props.articleId Target article's unique identifier (UUID format)
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Delete article by setting deleted_at timestamp (soft delete).
 *
 * 1. Verify article exists and is not already deleted
 * 2. Check authorization: allow if current user is article owner (discussion_board_member_id matches) OR has administrator role
 * 3. Begin database transaction
 * 4. Set deleted_at = current timestamp on discussion_board_articles record
 * 5. Cascade delete triggers automatically remove:
 *    - discussion_board_article_files (onDelete: Cascade)
 *    - discussion_board_article_images (onDelete: Cascade)
 *    - discussion_board_article_tags (onDelete: Cascade)
 *    - discussion_board_comments (onDelete: Cascade)
 * 6. Commit transaction
 * 7. Return 204 No Content on success
 *
 * Error handling:
 * - 404 if article not found or already deleted
 * - 403 if user is not owner and not administrator
 * - 409 if concurrent modification detected
 * @path /discussionBoard/member/articles/:articleId
 * @accessor api.functional.discussionBoard.member.articles.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Target article's unique identifier (UUID format)
     */
    articleId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/discussionBoard/member/articles/:articleId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/discussionBoard/member/articles/${encodeURIComponent(props.articleId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
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

/**
 * Search for discussion board articles by title or content text with optional tag filtering.
 *
 * This operation provides comprehensive article search capabilities across all sections. Users can search by entering keywords that match against article titles and content text using case-insensitive partial matching. The search supports tag-based filtering to narrow results to articles containing specific tags.
 *
 * Search results are returned in a paginated format with configurable page size. Each result includes the article title, author display name, associated tags, comment count, and creation timestamp. Results can be sorted by creation date in either newest-first or oldest-first order.
 *
 * The search automatically excludes soft-deleted articles and articles belonging to deleted sections. Both authenticated members and guest users can perform searches. Tag filtering is case-insensitive and supports multiple tags.
 *
 * Related operations: PATCH /articles for general article listing, GET /articles/{articleId} for viewing full article details, GET /tags for retrieving available tags.
 *
 * @param props.connection
 * @param props.body Search criteria including query text, tag filters, pagination, and sorting options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Query discussion_board_articles table with full-text search on title and content fields using GIN trigram indexes. Join with discussion_board_article_tags and discussion_board_tags for tag filtering. Join with discussion_board_members for author information. Left join with discussion_board_comments to calculate comment count per article. Filter out articles where deleted_at is not null. Filter out articles where the parent section's deleted_at is not null. Apply search query using ILIKE on title and content fields. Apply tag filter by matching tag names in discussion_board_tags. Support pagination with page and limit parameters. Support sorting by created_at ascending (oldest first) or descending (newest first). Return article summaries with title, author display name, tag names, comment count, and created_at timestamp.
 * @path /discussionBoard/member/articles/search
 * @accessor api.functional.discussionBoard.member.articles.search
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function search(
  connection: IConnection,
  props: search.Props,
): Promise<search.Response> {
  return true === connection.simulate
    ? search.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...search.METADATA,
          path: search.path(),
          status: null,
        },
        props.body,
      );
}
export namespace search {
  export type Props = {
    /**
     * Search criteria including query text, tag filters, pagination, and sorting options
     */
    body: IDiscussionBoardArticle.IRequest;
  };
  export type Body = IDiscussionBoardArticle.IRequest;
  export type Response = IPageIDiscussionBoardArticle.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/discussionBoard/member/articles/search",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/discussionBoard/member/articles/search";
  export const random = (): IPageIDiscussionBoardArticle.ISummary =>
    typia.random<IPageIDiscussionBoardArticle.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: search.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: search.path(),
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
