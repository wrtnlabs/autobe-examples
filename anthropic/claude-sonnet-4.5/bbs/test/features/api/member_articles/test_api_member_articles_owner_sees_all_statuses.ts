import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test authenticated member article retrieval endpoint.
 *
 * NOTE: Original scenario requested testing owner visibility of all article
 * statuses (draft, published, archived) by creating articles. However, no
 * article creation API is available in the provided SDK. This test validates
 * the retrieval endpoint functionality with comprehensive parameter testing
 * instead.
 *
 * Steps:
 *
 * 1. Create and authenticate a member account
 * 2. Test article retrieval with various query parameters
 * 3. Validate response structure and pagination
 * 4. Test filtering capabilities (status, date ranges, sorting)
 */
export async function test_api_member_articles_owner_sees_all_statuses(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  const memberId = authenticatedMember.id;

  // Step 2: Test basic article retrieval
  const basicQuery: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: memberId,
      body: {} satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(basicQuery);

  // Step 3: Validate response structure
  TestValidator.predicate(
    "pagination object should exist",
    basicQuery.pagination !== null && basicQuery.pagination !== undefined,
  );

  TestValidator.predicate(
    "data array should exist and be array type",
    Array.isArray(basicQuery.data),
  );

  TestValidator.predicate(
    "pagination current page should be valid",
    basicQuery.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be valid",
    basicQuery.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    basicQuery.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    basicQuery.pagination.pages >= 0,
  );

  // Step 4: Test with pagination parameters
  const paginatedQuery: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: memberId,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedQuery);

  TestValidator.equals(
    "pagination current should match requested page",
    paginatedQuery.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match requested limit",
    paginatedQuery.pagination.limit,
    10,
  );

  // Step 5: Test with status filter for draft articles
  const draftQuery: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: memberId,
      body: {
        status: "draft",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(draftQuery);

  // Step 6: Test with status filter for published articles
  const publishedQuery: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: memberId,
      body: {
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(publishedQuery);

  // Step 7: Test with status filter for archived articles
  const archivedQuery: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: memberId,
      body: {
        status: "archived",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(archivedQuery);

  // Step 8: Test with search query
  const searchQuery: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: memberId,
      body: {
        search: RandomGenerator.name(),
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchQuery);

  // Step 9: Test with sort parameters
  const sortedQuery: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: memberId,
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sortedQuery);

  // Step 10: Test comprehensive query with multiple parameters
  const comprehensiveQuery: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: memberId,
      body: {
        page: 1,
        limit: 20,
        sort_by: "published_at",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(comprehensiveQuery);

  TestValidator.predicate(
    "comprehensive query should return valid pagination",
    comprehensiveQuery.pagination.limit === 20,
  );
}
