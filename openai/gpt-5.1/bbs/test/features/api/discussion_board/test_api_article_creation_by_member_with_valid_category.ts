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

/**
 * Validate that a member user can create an article in an existing category.
 *
 * Business flow:
 *
 * 1. Create and authenticate a member user via /auth/memberUser/join.
 * 2. Create and authenticate an admin user via /auth/adminUser/join.
 * 3. As admin, create an article category via
 *    /discussionBoard/adminUser/articleCategories.
 * 4. Switch back to the member user via /auth/memberUser/login.
 * 5. As member, create an article via /discussionBoard/memberUser/articles using
 *    the categoryId from step 3.
 * 6. Assert response structure and that key fields (title/body/summary, category
 *    summary, moderationState, timestamps) satisfy business expectations.
 */
export async function test_api_article_creation_by_member_with_valid_category(
  connection: api.IConnection,
) {
  // 1. Register member user (join) to establish memberUser actor and session
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "127.0.0.1",
    href: "https://frontend.local/member/join",
    referrer: "https://frontend.local/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register admin user (join) to be able to create categories
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://frontend.local/admin/join",
    referrer: "https://frontend.local/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As admin, create an article category
  const uniqueCode = `ECON-${RandomGenerator.alphaNumeric(8)}`;
  const categoryCreateBody = {
    code: uniqueCode,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(createdCategory);

  // Basic sanity checks on created category
  TestValidator.equals(
    "created category code should match input code",
    createdCategory.code,
    categoryCreateBody.code,
  );
  TestValidator.equals(
    "created category name should match input name",
    createdCategory.name,
    categoryCreateBody.name,
  );
  TestValidator.equals(
    "created category description should match input description",
    createdCategory.description,
    categoryCreateBody.description,
  );

  // 4. Switch back to member user using login (ensuring memberUser actor context)
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://frontend.local/member/login",
    referrer: "https://frontend.local/member/joinComplete",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberReAuth: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberReAuth);

  // 5. As member user, create an article in the created category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 6. Validate that article echoes client-provided fields
  TestValidator.equals(
    "article title should echo the request title",
    createdArticle.title,
    articleCreateBody.title,
  );
  TestValidator.equals(
    "article body should echo the request body",
    createdArticle.body,
    articleCreateBody.body,
  );
  TestValidator.equals(
    "article summary should echo the request summary",
    createdArticle.summary,
    articleCreateBody.summary,
  );

  // Validate category summary is correctly embedded
  TestValidator.equals(
    "article category id should match created category id",
    createdArticle.category.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "article category code should match created category code",
    createdArticle.category.code,
    createdCategory.code,
  );
  TestValidator.equals(
    "article category name should match created category name",
    createdArticle.category.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "article category description should match created category description",
    createdArticle.category.description,
    createdCategory.description,
  );

  // Validate moderationState and timestamps are server-managed and non-empty
  TestValidator.predicate(
    "moderationState should be a non-empty string",
    createdArticle.moderationState.length > 0,
  );

  TestValidator.predicate(
    "createdAt should be a non-empty ISO date-time string",
    createdArticle.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be a non-empty ISO date-time string",
    createdArticle.updatedAt.length > 0,
  );
}
