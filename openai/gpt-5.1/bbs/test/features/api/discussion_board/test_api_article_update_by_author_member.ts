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
 * Verify that an author member user can update their own discussion board
 * article and reclassify it to a different category.
 *
 * Business flow:
 *
 * 1. Register a member user (author) and capture their credentials.
 * 2. Register an admin user who can manage article categories.
 * 3. As admin, create an initial category (Category A).
 * 4. As member, create an article in Category A.
 * 5. As admin, create a second category (Category B).
 * 6. As member, update the article: change title, body, summary and move it to
 *    Category B via PUT /discussionBoard/memberUser/articles/{articleId}.
 * 7. Assert that core identity fields (id, createdAt) are stable, content fields
 *    are updated, category summary points to Category B, and updatedAt is
 *    refreshed.
 */
export async function test_api_article_update_by_author_member(
  connection: api.IConnection,
) {
  // 1. Register member user (author)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://example.com/join/member",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoin);

  // 2. Register admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://example.com/join/admin",
    referrer: "https://example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 3. As admin, create Category A
  const categoryABody = {
    code: `CAT_A_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const categoryA: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryABody,
      },
    );
  typia.assert(categoryA);

  // 4. Switch to member context explicitly via login
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://example.com/login/member",
    referrer: "https://example.com/join/member/complete",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 5. As member, create an article under Category A
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalBody = RandomGenerator.content({ paragraphs: 2 });
  const originalSummary = RandomGenerator.paragraph({ sentences: 2 });

  const articleCreateBody = {
    title: originalTitle,
    body: originalBody,
    summary: originalSummary,
    categoryId: categoryA.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const originalArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(originalArticle);

  // 6. Switch back to admin and create Category B
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://example.com/login/admin",
    referrer: "https://example.com/join/admin/complete",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const categoryBBody = {
    code: `CAT_B_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 2 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const categoryB: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBBody,
      },
    );
  typia.assert(categoryB);

  // 7. Switch back to member and update the article
  const memberLoginAgain: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAgain);

  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedBody = RandomGenerator.content({ paragraphs: 3 });
  const updatedSummary = RandomGenerator.paragraph({ sentences: 2 });

  const articleUpdateBody = {
    title: updatedTitle,
    body: updatedBody,
    summary: updatedSummary,
    discussion_board_article_category_id: categoryB.id,
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.update(
      connection,
      {
        articleId: originalArticle.id,
        body: articleUpdateBody,
      },
    );
  typia.assert(updatedArticle);

  // 8. Business assertions
  // Identity invariants
  TestValidator.equals(
    "article id should remain unchanged after update",
    updatedArticle.id,
    originalArticle.id,
  );

  TestValidator.equals(
    "createdAt should remain unchanged after update",
    updatedArticle.createdAt,
    originalArticle.createdAt,
  );

  // updatedAt must change and be later or at least not equal; since both are
  // ISO date-time strings, we compare by Date.
  const originalUpdatedAtTime = new Date(originalArticle.updatedAt).getTime();
  const updatedUpdatedAtTime = new Date(updatedArticle.updatedAt).getTime();

  TestValidator.predicate(
    "updatedAt should be refreshed after article update",
    updatedUpdatedAtTime >= originalUpdatedAtTime &&
      updatedArticle.updatedAt !== originalArticle.updatedAt,
  );

  // Content should reflect updated values
  TestValidator.equals(
    "title should be updated",
    updatedArticle.title,
    updatedTitle,
  );

  TestValidator.equals(
    "body should be updated",
    updatedArticle.body,
    updatedBody,
  );

  TestValidator.equals(
    "summary should be updated (including null handling)",
    updatedArticle.summary ?? null,
    updatedSummary,
  );

  // Category summary should now point to Category B
  TestValidator.equals(
    "category id should point to Category B after update",
    updatedArticle.category.id,
    categoryB.id,
  );

  TestValidator.equals(
    "category code should match Category B",
    updatedArticle.category.code,
    categoryB.code,
  );

  TestValidator.equals(
    "category name should match Category B",
    updatedArticle.category.name,
    categoryB.name,
  );

  TestValidator.equals(
    "category description should match Category B",
    updatedArticle.category.description ?? null,
    categoryB.description ?? null,
  );
}
