import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { IDiscussionBoardSearch } from "../../../../structures/IDiscussionBoardSearch";
import { IPageIDiscussionBoardSearchResult } from "../../../../structures/IPageIDiscussionBoardSearchResult";

/**
 * Search across articles, comments, attachments, tags and authors.
 *
 * Purpose and overview:
 *
 * This operation provides a single, global search endpoint that satisfies user
 * needs for "search everything" across the discussion board. It composes
 * queries across the discussion_board_articles (title, content),
 * discussion_board_comments (content), discussion_board_tags (name/slug via the
 * junction table discussion_board_article_tags), discussion_board_attachments
 * (original_filename), and discussion_board_member (username and display_name)
 * models defined in the Prisma schema. The search leverages the existing
 * GIN/trigram indexes on title, content, and indexed name fields to deliver
 * performant full-text or similarity search.
 *
 * Security and permissions:
 *
 * The endpoint is public by default (authorizationActors = []). Public search
 * results must respect content state rules from the Content schema: only
 * articles with state = 'published' and comments/attachments that are not
 * hidden or quarantined are returned. The service implementation must filter
 * out soft-deleted records (deleted_at != null) and moderation-hidden content
 * (is_hidden / state) according to the rules in the database models. The
 * endpoint returns only fields appropriate for public consumption; sensitive
 * fields (e.g., member.email, password_hash) are never exposed.
 *
 * Data relationships and behavior:
 *
 * Results combine multiple underlying tables into a unified result type
 * IDiscussionBoardSearchResult. Each result object includes a discriminator
 * "type" ("article" | "comment" | "attachment" | "tag") and a minimal payload
 * referencing the originating entity (id, title/excerpt or filename, author
 * summary when applicable, created_at). When the result refers to an article,
 * it includes article summary fields derived from discussion_board_articles
 * (title, excerpt from content, is_pinned, published_at). When the result
 * refers to a comment, it includes the comment content excerpt and the parent
 * article reference. Tag results include tag name and slug from
 * discussion_board_tags. Attachment results include original_filename and
 * is_image from discussion_board_attachments. Author references use
 * discussion_board_member.username and display_name only.
 *
 * Validation rules and request options:
 *
 * The request body (IDiscussionBoardSearch.IRequest) supports:
 *
 * - Query (string): required for full-text matching; must be non-empty
 * - Filters: optional object allowing entity-type filtering (articles, comments,
 *   attachments, tags), category filter by discussion_board_category_id, tag
 *   slugs, author username, date ranges (created_from/created_to) mapped to
 *   ISO8601 datetimes
 * - Pagination: page, limit (limit capped at 100)
 * - Sorting: relevance (default), newest (created_at/published_at descending),
 *   oldest
 * - Highlight: optional boolean to request highlighted snippets for matched
 *   fields
 *
 * Related API operations:
 *
 * Clients typically call GET /articles/{id} to obtain full article details for
 * selected article search results, or GET /articles/{id}?includeComments=true
 * to fetch comments. Attachment downloads are performed via GET
 * /attachments/{id}/download. This global search operation is read-only and
 * intended to guide navigation to those resource-specific endpoints.
 *
 * Expected behavior and error handling:
 *
 * - Empty or whitespace-only query must return HTTP 400 with a clear validation
 *   message.
 * - Results must exclude soft-deleted records (deleted_at not null),
 *   moderation-hidden items (state != 'published' for articles, is_hidden =
 *   true for comments, quarantined = true for comment attachments), and
 *   quarantined attachments.
 * - Pagination metadata (total, page, limit) must be returned alongside result
 *   list. Partial results are possible when data sources respond at different
 *   latencies; the implementation should favor consistent snapshot semantics
 *   for the query.
 *
 * Implementation note (SQL/Prisma guidance):
 *
 * A sample implementation may perform parallel queries against each model using
 * Prisma where clauses and indexed full-text/trigram operations, then merge
 * results with relevance scoring. Example (conceptual):
 *
 * SELECT id, 'article' as type, title, ts_rank_cd(article_search_vector,
 * plainto_tsquery($1)) as rank FROM discussion_board_articles WHERE state =
 * 'published' AND (title ILIKE '%'||$1||'%' OR content ILIKE '%'||$1||'%')
 * ORDER BY rank DESC, published_at DESC
 *
 * This operation is read-only and maps to the IDiscussionBoardSearchResult
 * response DTO.
 *
 * @param props.connection
 * @param props.body Search criteria, filters and pagination parameters for the
 *   global search across articles, comments, attachments and tags.
 * @path /discussionBoard/search/global
 * @accessor api.functional.discussionBoard.search.global.search
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
     * Search criteria, filters and pagination parameters for the global
     * search across articles, comments, attachments and tags.
     */
    body: IDiscussionBoardSearch.IRequest;
  };
  export type Body = IDiscussionBoardSearch.IRequest;
  export type Response = IPageIDiscussionBoardSearchResult.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/discussionBoard/search/global",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/discussionBoard/search/global";
  export const random = (): IPageIDiscussionBoardSearchResult.ISummary =>
    typia.random<IPageIDiscussionBoardSearchResult.ISummary>();
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
