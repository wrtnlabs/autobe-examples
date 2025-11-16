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
 * Validate that updating a non-existent comment for an existing article fails
 * with an error and does not create any comment.
 *
 * Business context:
 *
 * - A member user can update their own comments on articles via PUT
 *   /discussionBoard/memberUser/articles/{articleId}/comments/{commentId}.
 * - The backend must strictly distinguish between existing and non-existent
 *   comments: sending a random commentId that is not tied to the given article
 *   must not succeed and must not create any comment (no upsert behavior).
 *
 * Test flow:
 *
 * 1. Register a member user (join) to obtain an authenticated member session.
 * 2. Register an admin user (join) to obtain an authenticated admin session.
 * 3. As admin, create an article category that can be referenced by articles.
 * 4. Switch authentication back to the member user.
 * 5. As member, create an article that belongs to the created category.
 * 6. Generate a random UUID that does not correspond to any existing commentId (we
 *    do not create any comments at all in this scenario).
 * 7. Attempt to update a comment using the existing articleId and the random
 *    commentId via
 *    api.functional.discussionBoard.memberUser.articles.comments.update with an
 *    IDiscussionBoardComment.IUpdate body.
 * 8. Assert that the API call fails by using TestValidator.error, and that no
 *    IDiscussionBoardComment instance is returned (because the call throws).
 *
 * Note:
 *
 * - We intentionally do not assert a specific HTTP status code, only that the
 *   operation fails, to keep the test robust and aligned with global
 *   restrictions on status-code testing.
 * - Since we never create any comments and the update call throws, the absence of
 *   any successful comment response is treated as evidence that the endpoint
 *   does not perform upsert-like creation.
 */
export async function test_api_member_comment_update_not_found(
  connection: api.IConnection,
) {
  // 1. Register member user (join)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    bio: null,
    location: null,
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register admin user (join) - this call also switches the SDK
  //    Authorization header to the admin token.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(1),
    bio: null,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As admin, create an article category
  const categoryCreateBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Switch authentication back to the member user using login.
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAfterLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  // 5. As member, create an article in the created category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 6. Generate a random UUID for a non-existent commentId
  const nonExistingCommentId = typia.random<string & tags.Format<"uuid">>();

  // 7. Attempt to update the non-existent comment and assert that it fails
  const updateBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardComment.IUpdate;

  await TestValidator.error(
    "updating non-existent comment must fail and not create a comment",
    async () => {
      await api.functional.discussionBoard.memberUser.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: nonExistingCommentId,
          body: updateBody,
        },
      );
    },
  );
}
