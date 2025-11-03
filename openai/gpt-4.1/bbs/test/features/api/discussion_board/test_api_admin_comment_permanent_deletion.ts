import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test the complete workflow for an administrator performing a permanent
 * deletion of a comment on a discussion board article.
 *
 * 1. Register an admin account and authenticate as admin.
 * 2. Register a user account and authenticate as user.
 * 3. Create a new article as the user.
 * 4. Post a comment as the user to the article.
 * 5. Switch authentication back to admin account.
 * 6. Admin performs a permanent deletion (hard-delete) on the comment.
 * 7. Confirm that the comment is no longer retrievable and has been fully removed.
 * 8. Attempting to delete the already-deleted comment again results in error.
 */
export async function test_api_admin_comment_permanent_deletion(
  connection: api.IConnection,
) {
  // 1. Register an admin account and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminDisplayName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: adminDisplayName,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Register a user account and authenticate as user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userDisplayName = RandomGenerator.name();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userAuth: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        display_name: userDisplayName,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(userAuth);

  // 3. Create a new article as the user
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 4. Post a comment as the user to the article
  const comment: IDiscussionBoardArticleComment =
    await api.functional.discussionBoard.user.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. Switch authentication back to admin
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  // The SDK auto sets the Authorization header for admin context

  // 6. Admin permanently deletes the comment
  await api.functional.discussionBoard.admin.articles.comments.erase(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );

  // 7. (Negative check) Attempting to delete the already-deleted comment causes an error
  await TestValidator.error(
    "admin cannot delete already-deleted comment",
    async () => {
      await api.functional.discussionBoard.admin.articles.comments.erase(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
        },
      );
    },
  );
}
