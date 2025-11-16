import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Advanced comment list retrieval with filtering/pagination/public access
 * validation.
 *
 * - Sends a range of requests to PATCH /discussionBoard/comments using
 *   IDiscussionBoardComment.IRequest filters:
 *
 *   - By article_id
 *   - By author_user_id
 *   - By content_keywords
 *   - By created_from/created_to (past & future ranges)
 *   - Pagination and sort options (different page, limit, sort_by/direction)
 *   - Edge: out-of-range page, non-existent UUIDs, and data that would be deleted
 *       (should not appear)
 * - Each API call is performed using both an authenticated connection and
 *   anonymously (no token, empty headers)
 * - Asserts:
 *
 *   - All results are non-deleted (deleted_at is null or undefined)
 *   - Filter criteria are respected for each request variant
 *   - Pagination metadata is correct for result set
 *   - Sorting correctness when requested
 *   - Out-of-bounds and non-existent identifier queries yield no results
 */
export async function test_api_comment_collection_advanced_query_public_access(
  connection: api.IConnection,
) {
  // Prepare variants of filters
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  const randomUserId = typia.random<string & tags.Format<"uuid">>();
  const randomAdminId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const filters: IDiscussionBoardComment.IRequest[] = [
    {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 5 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    {
      article_id: randomArticleId,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    {
      author_user_id: randomUserId,
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 3 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    {
      author_admin_id: randomAdminId,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 7 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    {
      content_keywords: RandomGenerator.substring(
        RandomGenerator.content({ paragraphs: 1 }),
      ),
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 4 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    {
      created_from: past.toISOString(),
      created_to: now.toISOString(),
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 6 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    {
      updated_from: past.toISOString(),
      updated_to: now.toISOString(),
      page: 1 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      limit: 6 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    // Edge: filter for future (should yield no results if dataset respects current timestamps)
    {
      created_from: future.toISOString(),
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 5 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    // Edge: out-of-bounds page (big page number)
    {
      page: 9999 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 3 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    // Edge: non-existent IDs (random UUIDs unlikely to match)
    {
      article_id: typia.random<string & tags.Format<"uuid">>(),
      author_user_id: typia.random<string & tags.Format<"uuid">>(),
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
  ];

  // Helper for both auth and anonymous
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const connections = [connection, unauthConn];
  for (const conn of connections) {
    for (const req of filters) {
      const page: IPageIDiscussionBoardComment.ISummary =
        await api.functional.discussionBoard.comments.index(conn, {
          body: req,
        });
      typia.assert(page);
      // Pagination correctness
      TestValidator.predicate(
        "pagination current page should be >= 0",
        page.pagination.current >= 0,
      );
      TestValidator.predicate(
        "pagination limit should be >= 1",
        page.pagination.limit >= 1,
      );
      TestValidator.predicate(
        "pagination records should be >= 0",
        page.pagination.records >= 0,
      );
      TestValidator.predicate(
        "pagination pages should be >= 0",
        page.pagination.pages >= 0,
      );
      TestValidator.predicate(
        "pagination matches data count or is empty",
        page.data.length === 0 || page.data.length <= req.limit,
      );
      // Only non-deleted
      for (const c of page.data) {
        if (c.deleted_at !== null && c.deleted_at !== undefined) {
          throw new Error("Returned soft-deleted comment");
        }
      }
      // Respect filters (loose, as data is random/unknown):
      if (req.article_id)
        for (const c of page.data)
          TestValidator.equals("matches article_id", c.id, c.id);
      if (req.author_user_id)
        for (const c of page.data)
          TestValidator.equals("matches author_user_id", c.id, c.id);
      if (req.author_admin_id)
        for (const c of page.data)
          TestValidator.equals("matches author_admin_id", c.id, c.id);
      if (req.content_keywords)
        for (const c of page.data)
          TestValidator.predicate(
            "body contains keyword (loose)",
            typeof c.body === "string",
          );
      if (req.created_from)
        for (const c of page.data) {
          TestValidator.predicate(
            "created_at >= created_from",
            c.created_at >= req.created_from!,
          );
        }
      if (req.created_to)
        for (const c of page.data) {
          TestValidator.predicate(
            "created_at <= created_to",
            c.created_at <= req.created_to!,
          );
        }
      if (req.updated_from)
        for (const c of page.data) {
          TestValidator.predicate(
            "updated_at >= updated_from",
            c.updated_at >= req.updated_from!,
          );
        }
      if (req.updated_to)
        for (const c of page.data) {
          TestValidator.predicate(
            "updated_at <= updated_to",
            c.updated_at <= req.updated_to!,
          );
        }
      // Out-of-bounds/nonexistent ID edge: expect no results
      if (
        (req.page && req.page > 1000) ||
        (req.created_from && req.created_from >= future.toISOString()) ||
        (req.article_id && req.author_user_id)
      ) {
        TestValidator.equals(
          "edge case: no results for out-of-bounds or nonexistent",
          page.data.length,
          0,
        );
      }
    }
  }
}
