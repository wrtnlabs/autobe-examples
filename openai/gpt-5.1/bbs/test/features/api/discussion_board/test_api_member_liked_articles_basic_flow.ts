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
import type { IDiscussionBoardArticleLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleLike";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Basic flow for a member user listing their liked articles.
 *
 * Business workflow:
 *
 * 1. Register a new member user (join) and capture the member id and
 *    email/password.
 * 2. Register a new admin user (join) so that we can create an article category.
 * 3. As admin, create a concrete article category via
 *    discussionBoard.adminUser.articleCategories.create.
 * 4. Log back in as the member user to restore member context.
 * 5. As the member, create at least two articles in the created category.
 * 6. Like exactly one of the created articles.
 * 7. Call memberUser.members.likedArticles.index for that member with an article
 *    request body (page/limit/categoryId).
 * 8. Verify that:
 *
 *    - The liked article appears in the result list and its category matches.
 *    - The non-liked article does not appear.
 *    - Pagination metadata is consistent with a single liked article.
 * 9. Optionally re-query with a different limit and verify stable ordering when
 *    only one liked article exists.
 */
export async function test_api_member_liked_articles_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphabets(12);

  const memberJoinRequest = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://frontend.example.com/join/member",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 2. Register admin user
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinRequest = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://frontend.example.com/admin/join",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  // 3. As admin, create an article category
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 4. Log back in as member user to ensure member context
  const memberLoginRequest = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://frontend.example.com/login/member",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAuthorizedAgain: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginRequest,
    });
  typia.assert(memberAuthorizedAgain);

  // 5. Member creates at least two articles under the category
  const articleCreateBody1 = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBody1 },
    );
  typia.assert(article1);

  const articleCreateBody2 = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBody2 },
    );
  typia.assert(article2);

  // 6. Like exactly one article (article1)
  const likeCreateBody = {} satisfies IDiscussionBoardArticleLike.ICreate;

  const likeResult: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      {
        articleId: article1.id,
        body: likeCreateBody,
      },
    );
  typia.assert(likeResult);

  TestValidator.equals(
    "liked article in likeResult matches article1",
    likeResult.article.id,
    article1.id,
  );

  // 7. Query liked articles for this member with pagination and filters
  const likedArticlesRequestBody = {
    page: 1,
    limit: 10,
    search: undefined,
    categoryId: category.id,
    moderationState: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: "createdAt",
    orderDirection: "desc",
  } satisfies IDiscussionBoardArticle.IRequest;

  const likedPage: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.memberUser.members.likedArticles.index(
      connection,
      {
        memberUserId: memberId,
        body: likedArticlesRequestBody,
      },
    );
  typia.assert(likedPage);

  const pagination: IPage.IPagination = likedPage.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "liked articles pagination has at least one record",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "liked articles pagination pages is at least 1",
    pagination.pages >= 1,
  );

  const likedSummaries = likedPage.data;

  TestValidator.predicate(
    "at least one liked article summary is returned",
    likedSummaries.length >= 1,
  );

  const likedSummaryForArticle1 = likedSummaries.find(
    (summary) => summary.id === article1.id,
  );

  TestValidator.predicate(
    "liked article1 appears in liked articles list",
    likedSummaryForArticle1 !== undefined,
  );

  if (likedSummaryForArticle1 !== undefined) {
    TestValidator.equals(
      "liked article1 category matches created category",
      likedSummaryForArticle1.category.id,
      category.id,
    );
  }

  const summaryForArticle2 = likedSummaries.find(
    (summary) => summary.id === article2.id,
  );

  TestValidator.predicate(
    "unliked article2 does not appear in liked articles list",
    summaryForArticle2 === undefined,
  );

  // 8. Optional: re-query with different limit to ensure stable result when only one liked article exists
  const likedArticlesRequestBodyLimit1 = {
    page: 1,
    limit: 1,
    search: undefined,
    categoryId: category.id,
    moderationState: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: "createdAt",
    orderDirection: "desc",
  } satisfies IDiscussionBoardArticle.IRequest;

  const likedPageLimit1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.memberUser.members.likedArticles.index(
      connection,
      {
        memberUserId: memberId,
        body: likedArticlesRequestBodyLimit1,
      },
    );
  typia.assert(likedPageLimit1);

  if (likedPageLimit1.data.length > 0) {
    const firstSummary = likedPageLimit1.data[0];
    TestValidator.equals(
      "first liked article with limit 1 is article1",
      firstSummary.id,
      article1.id,
    );
  }
}
