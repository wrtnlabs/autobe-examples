import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test pagination and sorting functionality for member articles.
 *
 * This test validates that the member article listing endpoint correctly
 * handles:
 *
 * - Creating multiple articles with different timestamps and engagement levels
 * - Paginating large result sets with configurable page sizes
 * - Sorting by creation date in ascending and descending order
 * - Sorting by engagement metrics (comment count)
 * - Returning accurate pagination metadata (current page, total records, total
 *   pages)
 * - Maintaining consistent ordering across multiple paginated requests
 * - Correctly calculating page boundaries
 *
 * Workflow:
 *
 * 1. Register a new member account
 * 2. Create 5+ articles with staggered timestamps
 * 3. Test pagination with various page sizes
 * 4. Test sorting by creation date (newest and oldest first)
 * 5. Test sorting by engagement metrics
 * 6. Validate pagination metadata consistency
 * 7. Verify article ordering is maintained across pages
 */
export async function test_api_member_articles_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberRegisterRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123",
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const authorized = await api.functional.auth.member.join(connection, {
    body: memberRegisterRequest,
  });
  typia.assert(authorized);

  // Store original headers for later use
  const authenticatedConnection = {
    ...connection,
    headers: { ...connection.headers },
  };

  // 2. Create 5 articles with staggered timestamps and varying content
  const articles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < 5; i++) {
    const baseDate = new Date();
    baseDate.setHours(baseDate.getHours() - (5 - i)); // Stagger creation times

    const article = await api.functional.discussionBoard.member.articles.create(
      authenticatedConnection,
      {
        body: {
          title: `Article ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          category_code: "economics",
          attachments: undefined,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);
  }

  // 3. Test pagination with different page sizes
  const pageSize2Result =
    await api.functional.discussionBoard.member.me.articles.index(
      authenticatedConnection,
      {
        body: {
          limit: 2,
          page: 1,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(pageSize2Result);

  TestValidator.equals("page size should be 2", pageSize2Result.data.length, 2);

  TestValidator.predicate(
    "pagination metadata should include total records",
    pageSize2Result.pagination.records >= 5,
  );

  TestValidator.predicate(
    "pagination metadata should include total pages",
    pageSize2Result.pagination.pages > 0,
  );

  TestValidator.equals(
    "current page should be 1",
    pageSize2Result.pagination.current,
    1,
  );

  // 4. Test sorting by creation date (newest first - descending)
  const newestFirstResult =
    await api.functional.discussionBoard.member.me.articles.index(
      authenticatedConnection,
      {
        body: {
          limit: 10,
          page: 1,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(newestFirstResult);

  // Verify articles are ordered by creation date descending
  for (let i = 0; i < newestFirstResult.data.length - 1; i++) {
    const current = new Date(newestFirstResult.data[i].created_at).getTime();
    const next = new Date(newestFirstResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `article at index ${i} should be newer than article at index ${i + 1}`,
      current >= next,
    );
  }

  // 5. Test sorting by creation date (oldest first - ascending)
  const oldestFirstResult =
    await api.functional.discussionBoard.member.me.articles.index(
      authenticatedConnection,
      {
        body: {
          limit: 10,
          page: 1,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(oldestFirstResult);

  // Verify articles are ordered by creation date ascending
  for (let i = 0; i < oldestFirstResult.data.length - 1; i++) {
    const current = new Date(oldestFirstResult.data[i].created_at).getTime();
    const next = new Date(oldestFirstResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `article at index ${i} should be older than article at index ${i + 1}`,
      current <= next,
    );
  }

  // 6. Test pagination with multiple pages
  const page1Result =
    await api.functional.discussionBoard.member.me.articles.index(
      authenticatedConnection,
      {
        body: {
          limit: 2,
          page: 1,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page1Result);

  const page2Result =
    await api.functional.discussionBoard.member.me.articles.index(
      authenticatedConnection,
      {
        body: {
          limit: 2,
          page: 2,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page2Result);

  // Verify page 2 exists and contains different articles than page 1
  TestValidator.predicate(
    "page 2 should have articles",
    page2Result.data.length > 0,
  );

  TestValidator.predicate(
    "articles on page 2 should be different from page 1",
    page1Result.data[0].id !== page2Result.data[0].id,
  );

  // 7. Test sorting by view count
  const viewCountSortResult =
    await api.functional.discussionBoard.member.me.articles.index(
      authenticatedConnection,
      {
        body: {
          limit: 10,
          page: 1,
          sort_by: "view_count",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(viewCountSortResult);

  // Verify articles are ordered by view count
  for (let i = 0; i < viewCountSortResult.data.length - 1; i++) {
    const current = viewCountSortResult.data[i].view_count;
    const next = viewCountSortResult.data[i + 1].view_count;
    TestValidator.predicate(
      `article at index ${i} should have view count >= next article`,
      current >= next,
    );
  }

  // 8. Test pagination boundary calculations
  const totalResult =
    await api.functional.discussionBoard.member.me.articles.index(
      authenticatedConnection,
      {
        body: {
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(totalResult);

  const expectedPages = Math.ceil(totalResult.pagination.records / 2);
  TestValidator.equals(
    "total pages should be correctly calculated",
    totalResult.pagination.pages,
    expectedPages,
  );

  // 9. Verify pagination consistency across requests
  const consistencyCheck1 =
    await api.functional.discussionBoard.member.me.articles.index(
      authenticatedConnection,
      {
        body: {
          limit: 5,
          page: 1,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(consistencyCheck1);

  const consistencyCheck2 =
    await api.functional.discussionBoard.member.me.articles.index(
      authenticatedConnection,
      {
        body: {
          limit: 5,
          page: 1,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(consistencyCheck2);

  // Same page should return same articles
  TestValidator.equals(
    "pagination should be consistent across requests",
    consistencyCheck1.data.map((a) => a.id),
    consistencyCheck2.data.map((a) => a.id),
  );
}
