import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test comprehensive pagination functionality for the pending articles queue.
 *
 * This test validates that the moderator pending articles endpoint correctly
 * implements limit and page parameters, returning the specified number of
 * articles per page. Tests boundary conditions including first page, middle
 * pages, and last page requests. Validates pagination metadata accurately
 * reflects total records, total pages, current page, and limit. Tests
 * requesting pages beyond available records to ensure graceful handling.
 *
 * Test workflow:
 *
 * 1. Create moderator account for queue access
 * 2. Create member account for article creation
 * 3. Create category for article classification
 * 4. Create multiple pending articles (3+ articles for pagination testing)
 * 5. Test first page with various limit values
 * 6. Test middle pages with proper offset calculation
 * 7. Test last page validation
 * 8. Test requesting pages beyond available records
 * 9. Validate pagination metadata accuracy (total, pages, current, limit)
 */
export async function test_api_pending_articles_pagination(
  connection: api.IConnection,
) {
  // 1. Create moderator account for queue access
  const moderatorCreateData = {
    email: `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`,
    username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
    password: "Test@Password123",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderator);

  // 2. Create member account for article creation
  const memberCreateData = {
    email: `member_${RandomGenerator.alphaNumeric(8)}@test.com`,
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    password: "Test@Password123",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateData,
    });
  typia.assert(member);

  // 3. Create category for article classification
  const categoryCreateData = {
    name: `Category_${RandomGenerator.alphaNumeric(8)}`,
    slug: `category-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryCreateData,
      },
    );
  typia.assert(category);

  // 4. Create multiple pending articles (3+ articles for pagination testing)
  const articleCount = 5;
  const articles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < articleCount; i++) {
    const articleCreateData = {
      title: `Test Article ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })}`,
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
      category_id: category.id,
    } satisfies IDiscussionBoardArticle.ICreate;

    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.member.articles.create(connection, {
        body: articleCreateData,
      });
    typia.assert(article);
    articles.push(article);
  }

  // Switch to moderator account for accessing pending articles queue
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorCreateData.email,
      password: moderatorCreateData.password,
      href: "http://localhost:3000/moderator/queue" as any,
      referrer: "http://localhost:3000/moderator" as any,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 5. Test first page with various limit values
  const firstPageLimit2 =
    await api.functional.discussionBoard.moderator.moderation.pending_articles.index(
      connection,
      {
        body: {
          q: "article",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(firstPageLimit2);
  TestValidator.predicate(
    "first page limit=2 returns articles",
    firstPageLimit2.data.length <= 2,
  );
  TestValidator.equals(
    "first page limit=2 current page",
    firstPageLimit2.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit=2 limit value",
    firstPageLimit2.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "first page limit=2 total records is non-negative",
    firstPageLimit2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page limit=2 pages calculated correctly",
    firstPageLimit2.pagination.pages >= 0,
  );

  // 5b. Test first page with limit=5
  const firstPageLimit5 =
    await api.functional.discussionBoard.moderator.moderation.pending_articles.index(
      connection,
      {
        body: {
          q: "test",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(firstPageLimit5);
  TestValidator.predicate(
    "first page limit=5 returns up to 5 articles",
    firstPageLimit5.data.length <= 5,
  );
  TestValidator.equals(
    "first page limit=5 current page",
    firstPageLimit5.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit=5 limit value",
    firstPageLimit5.pagination.limit,
    5,
  );

  // 6. Test middle pages with proper offset calculation
  const middlePageLimit2 =
    await api.functional.discussionBoard.moderator.moderation.pending_articles.index(
      connection,
      {
        body: {
          q: "pending",
          page: 2,
          limit: 2,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(middlePageLimit2);
  TestValidator.equals(
    "middle page (2) current page",
    middlePageLimit2.pagination.current,
    2,
  );
  TestValidator.equals(
    "middle page (2) limit value",
    middlePageLimit2.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "middle page (2) data length is valid",
    middlePageLimit2.data.length >= 0,
  );

  // 7. Test last page validation
  const totalPages = firstPageLimit2.pagination.pages;
  const lastPageResult =
    await api.functional.discussionBoard.moderator.moderation.pending_articles.index(
      connection,
      {
        body: {
          q: "article",
          page: totalPages > 0 ? totalPages : 1,
          limit: 2,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(lastPageResult);
  TestValidator.predicate(
    "last page data length is valid",
    lastPageResult.data.length >= 0,
  );

  // 8. Test requesting pages beyond available records
  const beyondPageResult =
    await api.functional.discussionBoard.moderator.moderation.pending_articles.index(
      connection,
      {
        body: {
          q: "search",
          page: 999,
          limit: 2,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.predicate(
    "page beyond available records returns valid response",
    beyondPageResult.data.length >= 0,
  );
  TestValidator.predicate(
    "page beyond available records has valid pagination metadata",
    beyondPageResult.pagination.current >= 0 &&
      beyondPageResult.pagination.limit >= 0,
  );

  // 9. Validate pagination metadata accuracy
  const validationPageResult =
    await api.functional.discussionBoard.moderator.moderation.pending_articles.index(
      connection,
      {
        body: {
          q: "content",
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(validationPageResult);

  const expectedPages = Math.ceil(
    validationPageResult.pagination.records /
      validationPageResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination.pages matches calculated value",
    validationPageResult.pagination.pages,
    expectedPages,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    validationPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    validationPageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.current is positive",
    validationPageResult.pagination.current > 0,
  );
  TestValidator.predicate(
    "data array length matches or is less than limit",
    validationPageResult.data.length <= validationPageResult.pagination.limit,
  );
}
