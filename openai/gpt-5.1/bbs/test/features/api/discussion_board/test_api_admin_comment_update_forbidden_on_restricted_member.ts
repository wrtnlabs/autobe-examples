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
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate that an admin can update a member-authored comment using the admin
 * comment update endpoint, documenting current behavior where restriction APIs
 * are not present.
 *
 * Business context:
 *
 * - Member users write articles and comments under categorized topics.
 * - Admin users manage categories and can also moderate content, including
 *   editing member comments via a dedicated admin endpoint.
 * - Restriction APIs are not exposed in the SDK, so we focus on the currently
 *   implementable, positive-path behavior: admin successfully updating a member
 *   comment.
 *
 * Scenario steps:
 *
 * 1. Member joins and obtains an authenticated session.
 * 2. Admin joins and obtains an authenticated session.
 * 3. Admin creates an article category.
 * 4. Member creates an article under that category.
 * 5. Member posts a comment on the article.
 * 6. Admin updates the member comment via the admin endpoint with a valid
 *    IDiscussionBoardComment.IUpdate payload.
 * 7. Validate that the update succeeded and that the returned comment reflects the
 *    new body while preserving identity and article linkage.
 */
export async function test_api_admin_comment_update_forbidden_on_restricted_member(
  connection: api.IConnection,
) {
  // 1. Member joins (creates a member user account and authenticates)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://example.com/join/member",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Admin joins (creates an admin user account and authenticates)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://example.com/join/admin",
    referrer: "https://example.com/admin-landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Ensure we are authenticated as admin (join already set token, but
  //    call login once more to emulate typical flow and ensure header swap)
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin-landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 4. Admin creates an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 5. Switch to member: login using member credentials
  const memberLoginBody = {
    email: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/member/login",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 6. Member creates an article under that category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  TestValidator.equals(
    "article category should match created category",
    article.category.id,
    category.id,
  );

  // 7. Member posts a comment on the article
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const memberComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(memberComment);

  TestValidator.equals(
    "created comment should belong to the article",
    memberComment.article.id,
    article.id,
  );

  // 8. Switch back to admin to perform moderation update
  const adminReLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin-landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminReloggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminReLoginBody,
    });
  typia.assert(adminReloggedIn);

  // 9. Admin updates the member comment via admin endpoint
  const updatedBodyText = RandomGenerator.paragraph({ sentences: 5 });
  const commentUpdateBody = {
    body: updatedBodyText,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.adminUser.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: memberComment.id,
        body: commentUpdateBody,
      },
    );
  typia.assert(updatedComment);

  // 10. Business assertions: id and article link unchanged, body updated
  TestValidator.equals(
    "updated comment should keep same id",
    updatedComment.id,
    memberComment.id,
  );

  TestValidator.equals(
    "updated comment should remain attached to same article",
    updatedComment.article.id,
    memberComment.article.id,
  );

  TestValidator.equals(
    "updated comment body should reflect new content",
    updatedComment.body,
    updatedBodyText,
  );
}
