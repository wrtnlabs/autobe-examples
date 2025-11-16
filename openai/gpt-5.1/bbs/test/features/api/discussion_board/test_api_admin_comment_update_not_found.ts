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
 * Validate that an admin cannot update a non-existent comment under an existing
 * article.
 *
 * Business intent:
 *
 * - When an adminUser targets a commentId that does not exist (for a valid
 *   articleId), the comments.update endpoint must fail instead of creating or
 *   upserting a comment.
 * - The test focuses on error semantics (operation must throw) rather than
 *   specific HTTP status codes.
 *
 * Test steps:
 *
 * 1. Register an admin user using /auth/adminUser/join to obtain adminUser
 *    context.
 * 2. Register a member user using /auth/memberUser/join to act as an article
 *    author.
 * 3. As the admin user, create an article category via
 *    /discussionBoard/adminUser/articleCategories to get a valid categoryId.
 * 4. Switch to the memberUser context (login) if necessary and create an article
 *    via /discussionBoard/memberUser/articles using the category from step 3.
 * 5. Generate a random UUID for commentId that is extremely unlikely to correspond
 *    to any real comment under that article.
 * 6. Switch back to adminUser context (login) to call the admin-only
 *    comments.update endpoint.
 * 7. Invoke PUT
 *    /discussionBoard/adminUser/articles/{articleId}/comments/{commentId} via
 *    api.functional.discussionBoard.adminUser.articles.comments.update, passing
 *    the existing article.id and the random commentId with a valid
 *    IDiscussionBoardComment.IUpdate body.
 * 8. Wrap this call in TestValidator.error to assert that the operation fails
 *    (throws), thereby confirming that the endpoint does not upsert when a
 *    non-existent commentId is provided.
 *
 * Notes:
 *
 * - We do not verify a specific HTTP status (like 404) because HTTP status code
 *   assertions are out of scope for these tests.
 * - We also cannot explicitly assert that no comment was created, because no
 *   comment listing or lookup functions are available in this scope; instead,
 *   we rely on the error behavior as the observable contract.
 */
export async function test_api_admin_comment_update_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin user (adminUser join) and obtain admin auth context.
  const adminJoinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();
  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a member user (memberUser join) to act as article author.
  const memberJoinBody =
    typia.random<IDiscussionBoardMemberUserJoin.IRequest>();
  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Ensure admin context, then create an article category as admin.
  const categoryCreateBody =
    typia.random<IDiscussionBoardArticleCategory.ICreate>();
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Log in as memberUser to ensure member context, then create an article.
  const memberLoginBody: IDiscussionBoardMemberUserLogin.IRequest = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip ?? null,
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  };
  const memberLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  const articleCreateBody: IDiscussionBoardArticle.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    summary: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    categoryId: category.id,
  };
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 5. Generate a random UUID for a non-existent commentId.
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // 6. Switch back to adminUser context via admin login.
  const adminLoginBody: IDiscussionBoardAdminUserLogin.IRequest = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  };
  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 7-8. Attempt to update a non-existent comment as admin and expect an error.
  const updateBody: IDiscussionBoardComment.IUpdate = {
    body: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 10 }),
  };

  await TestValidator.error(
    "admin updating non-existent comment should fail",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: nonExistentCommentId,
          body: updateBody,
        },
      );
    },
  );
}
