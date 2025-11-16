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

export async function test_api_discussion_board_article_detail_basic_read(
  connection: api.IConnection,
) {
  // 1. Register an admin user (adminUser actor) so we can create categories
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Admin!234", // satisfies tags.Format<"password"> semantics
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Optionally, login as the same admin to demonstrate actor switching
  const adminLoginBody = {
    email: adminEmail,
    password: "Admin!234",
    ip: "127.0.0.1",
    href: "https://admin.test.local/login",
    referrer: "https://admin.test.local/join-complete",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 3. As adminUser, create a discussion-board article category
  const categoryCode = `CAT_${RandomGenerator.alphaNumeric(8)}`;
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categoryDescription = RandomGenerator.paragraph({ sentences: 4 });
  const categoryOrder = 1;

  const categoryCreateBody = {
    code: categoryCode,
    name: categoryName,
    description: categoryDescription,
    order: categoryOrder,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(createdCategory);

  // 4. Register a member user (memberUser actor) so we can create an article
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: "Member!234",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: "127.0.0.1",
    href: "https://app.test.local/join",
    referrer: "https://app.test.local/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorizedFromJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 5. Optionally, login as the member to show login flow (even though join already authenticated)
  const memberLoginBody = {
    email: memberEmail,
    password: "Member!234",
    ip: "127.0.0.1",
    href: "https://app.test.local/login",
    referrer: "https://app.test.local/join-complete",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAuthorizedFromLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 6. As memberUser, create an article referencing the created category
  const articleTitle = "Discussion board detail read basic test";
  const articleBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 10,
  });
  const articleSummary = RandomGenerator.paragraph({ sentences: 3 });

  const articleCreateBody = {
    title: articleTitle,
    body: articleBody,
    summary: articleSummary,
    categoryId: createdCategory.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(createdArticle);

  // Verify that creation response echoes input as expected
  TestValidator.equals(
    "created article title matches input",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "created article body matches input",
    createdArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "created article summary matches input",
    createdArticle.summary ?? null,
    articleSummary,
  );
  TestValidator.equals(
    "created article category id matches created category",
    createdArticle.category.id,
    createdCategory.id,
  );

  // 7. Call GET /discussionBoard/articles/{articleId} to retrieve detail
  const firstDetail: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(firstDetail);

  // 8. Validate business expectations on the detail response
  TestValidator.equals(
    "detail article id matches created article id",
    firstDetail.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "detail article title matches creation input",
    firstDetail.title,
    articleTitle,
  );
  TestValidator.equals(
    "detail article body matches creation input",
    firstDetail.body,
    articleBody,
  );
  TestValidator.equals(
    "detail article summary matches creation input",
    firstDetail.summary ?? null,
    articleSummary,
  );

  // Category summary correspondence
  TestValidator.equals(
    "detail category id matches created category",
    firstDetail.category.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "detail category code matches created category",
    firstDetail.category.code,
    createdCategory.code,
  );
  TestValidator.equals(
    "detail category name matches created category",
    firstDetail.category.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "detail category description matches created category",
    firstDetail.category.description ?? null,
    createdCategory.description ?? null,
  );

  // Moderation and timestamps: moderationState is a non-empty string
  TestValidator.predicate(
    "moderationState should be a non-empty string",
    firstDetail.moderationState.length > 0,
  );

  // createdAt and updatedAt should be valid date-time strings; typia.assert already validated format
  // Ensure updatedAt >= createdAt lexicographically for ISO strings
  TestValidator.predicate(
    "updatedAt should be greater than or equal to createdAt",
    firstDetail.updatedAt >= firstDetail.createdAt,
  );

  // 9. Call GET again to confirm read-only behavior for business-visible fields
  const secondDetail: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(secondDetail);

  // Ensure the second fetch matches the first one for core fields
  TestValidator.equals(
    "second detail article id matches first detail",
    secondDetail.id,
    firstDetail.id,
  );
  TestValidator.equals(
    "second detail article title matches first detail",
    secondDetail.title,
    firstDetail.title,
  );
  TestValidator.equals(
    "second detail article body matches first detail",
    secondDetail.body,
    firstDetail.body,
  );
  TestValidator.equals(
    "second detail article summary matches first detail",
    secondDetail.summary ?? null,
    firstDetail.summary ?? null,
  );
  TestValidator.equals(
    "second detail category summary matches first detail",
    secondDetail.category,
    firstDetail.category,
  );
  TestValidator.equals(
    "second detail moderationState matches first detail",
    secondDetail.moderationState,
    firstDetail.moderationState,
  );
  TestValidator.equals(
    "second detail createdAt matches first detail",
    secondDetail.createdAt,
    firstDetail.createdAt,
  );
  TestValidator.equals(
    "second detail updatedAt matches first detail",
    secondDetail.updatedAt,
    firstDetail.updatedAt,
  );
}
