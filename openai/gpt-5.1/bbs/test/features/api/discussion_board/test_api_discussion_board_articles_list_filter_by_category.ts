import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Validate category-based filtering in the public article listing endpoint.
 *
 * ## Business context
 *
 * The discussion board provides a generic article listing/search endpoint
 * `PATCH /discussionBoard/articles` that supports multiple filters, including
 * `categoryId`. Articles are created by member users under specific categories
 * that administrators manage. This test ensures that when `categoryId` is
 * provided, the endpoint returns only articles that belong to that category,
 * and that pagination metadata reflects only the filtered subset. It also
 * covers symmetric behavior across multiple categories and the empty-result
 * case for a category with no articles.
 *
 * ## Steps
 *
 * 1. Join as an admin user (adminUser actor) to obtain an admin session.
 * 2. As adminUser, create two distinct article categories (A and B).
 * 3. Join as a member user (memberUser actor) to obtain a member session.
 * 4. As memberUser, create several articles in category A and category B.
 * 5. Call `PATCH /discussionBoard/articles` filtered by category A and assert
 *    that:
 *
 *    - All returned article summaries belong to category A.
 *    - No article from category B appears.
 *    - Pagination metadata reflects the number of category A articles.
 * 6. Repeat step 5 for category B (symmetric behavior).
 * 7. Create a third category C with no articles and verify that filtering by C
 *    returns an empty data array with coherent pagination fields.
 */
export async function test_api_discussion_board_articles_list_filter_by_category(
  connection: api.IConnection,
) {
  // 1. Join as admin user to seed categories
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create two categories A and B as adminUser
  const categoryABody = {
    code: `ECONOMY_${RandomGenerator.alphaNumeric(6)}`,
    name: "Economy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const categoryA: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryABody },
    );
  typia.assert<IDiscussionBoardArticleCategory>(categoryA);

  const categoryBBody = {
    code: `POLITICS_${RandomGenerator.alphaNumeric(6)}`,
    name: "Politics",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 2,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const categoryB: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBBody },
    );
  typia.assert<IDiscussionBoardArticleCategory>(categoryB);

  // 7. Prepare third category C for empty-case later
  const categoryCBody = {
    code: `EMPTY_${RandomGenerator.alphaNumeric(6)}`,
    name: "Empty Category",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 3,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const categoryC: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCBody },
    );
  typia.assert<IDiscussionBoardArticleCategory>(categoryC);

  // 3. Join as member user
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://example.com/member/join",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(memberAuthorized);

  // 4. Create articles in categories A and B
  const numArticlesA = 3;
  const numArticlesB = 2;

  const createdArticlesA: IDiscussionBoardArticle[] = [];
  const createdArticlesB: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < numArticlesA; i++) {
    const bodyA = {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
      summary: RandomGenerator.paragraph({ sentences: 2 }),
      categoryId: categoryA.id,
    } satisfies IDiscussionBoardArticle.ICreate;

    const articleA: IDiscussionBoardArticle =
      await api.functional.discussionBoard.memberUser.articles.create(
        connection,
        { body: bodyA },
      );
    typia.assert<IDiscussionBoardArticle>(articleA);
    createdArticlesA.push(articleA);
  }

  for (let i = 0; i < numArticlesB; i++) {
    const bodyB = {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
      summary: RandomGenerator.paragraph({ sentences: 2 }),
      categoryId: categoryB.id,
    } satisfies IDiscussionBoardArticle.ICreate;

    const articleB: IDiscussionBoardArticle =
      await api.functional.discussionBoard.memberUser.articles.create(
        connection,
        { body: bodyB },
      );
    typia.assert<IDiscussionBoardArticle>(articleB);
    createdArticlesB.push(articleB);
  }

  const idsA = createdArticlesA.map((a) => a.id);
  const idsB = createdArticlesB.map((a) => a.id);

  // 5. Filter by category A
  const requestA = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    categoryId: categoryA.id,
  } satisfies IDiscussionBoardArticle.IRequest;

  const pageA: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: requestA,
    });
  typia.assert<IPageIDiscussionBoardArticle.ISummary>(pageA);

  // Pagination expectations for A
  TestValidator.equals(
    "pagination.records should equal number of category A articles",
    pageA.pagination.records,
    numArticlesA,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit",
    pageA.pagination.limit,
    requestA.limit,
  );
  TestValidator.predicate(
    "pagination.current should be non-negative",
    pageA.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 1 when there are records",
    pageA.pagination.records > 0 ? pageA.pagination.pages >= 1 : true,
  );

  // All returned articles should belong to category A and not B
  for (const summary of pageA.data) {
    // category id match
    TestValidator.equals(
      "summary.category.id must equal category A id",
      summary.category.id,
      categoryA.id,
    );

    // When codes are unique, match by code as well
    TestValidator.equals(
      "summary.category.code must match category A code",
      summary.category.code,
      categoryA.code,
    );

    // Ensure no B articles leak into A filter
    TestValidator.predicate(
      "no category B article id should appear when filtering by category A",
      idsB.includes(summary.id) === false,
    );

    // Ensure the summary corresponds to one of the created A articles
    TestValidator.predicate(
      "summary.id must belong to set of created A article ids",
      idsA.includes(summary.id),
    );
  }

  // 6. Filter by category B (symmetric behavior)
  const requestB = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    categoryId: categoryB.id,
  } satisfies IDiscussionBoardArticle.IRequest;

  const pageB: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: requestB,
    });
  typia.assert<IPageIDiscussionBoardArticle.ISummary>(pageB);

  TestValidator.equals(
    "pagination.records for category B should equal number of category B articles",
    pageB.pagination.records,
    numArticlesB,
  );
  TestValidator.equals(
    "pagination.limit for category B should equal requested limit",
    pageB.pagination.limit,
    requestB.limit,
  );
  TestValidator.predicate(
    "pagination.current for category B should be non-negative",
    pageB.pagination.current >= 0,
  );

  for (const summary of pageB.data) {
    TestValidator.equals(
      "summary.category.id must equal category B id",
      summary.category.id,
      categoryB.id,
    );
    TestValidator.equals(
      "summary.category.code must match category B code",
      summary.category.code,
      categoryB.code,
    );
    TestValidator.predicate(
      "no category A article id should appear when filtering by category B",
      idsA.includes(summary.id) === false,
    );
    TestValidator.predicate(
      "summary.id must belong to set of created B article ids",
      idsB.includes(summary.id),
    );
  }

  // 7. Filter by category C which has no articles
  const requestC = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    categoryId: categoryC.id,
  } satisfies IDiscussionBoardArticle.IRequest;

  const pageC: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: requestC,
    });
  typia.assert<IPageIDiscussionBoardArticle.ISummary>(pageC);

  TestValidator.equals(
    "records should be zero for category with no articles",
    pageC.pagination.records,
    0,
  );
  TestValidator.equals(
    "data array should be empty for category with no articles",
    pageC.data.length,
    0,
  );
}
