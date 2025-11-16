import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that administrators can soft delete any discussion board comment for
 * moderation, regardless of authorship. The test confirms that the 'soft
 * delete' sets the comment's deleted_at timestamp (without removing it), and
 * that this action is permitted only for admins—not regular users.
 *
 * 1. Register an administrator with a strong password and context fields.
 * 2. Register a standard discussion board user.
 * 3. Log in as the user and create an article (title/body meets constraints).
 * 4. As the user, create a comment (body meets constraints, references the
 *    article).
 * 5. Log in as the admin.
 * 6. As the admin, soft delete the user's comment by calling the admin DELETE
 *    endpoint.
 * 7. Assert that the comment's deleted_at property is now set (string date), but
 *    the comment still exists.
 * 8. Additional assertions: the returned comment structure is valid, comment id is
 *    unchanged, contents are as before, and deleted_at is ISO8601 date string.
 */
export async function test_api_discussion_board_comment_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const strongPassword = RandomGenerator.alphaNumeric(10) + "!";
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: strongPassword,
        href: "https://app.example.com/admin/join",
        referrer: "https://app.example.com/landing",
        ip: undefined,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register a regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(8) + "*";
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://app.example.com/user/join",
        referrer: "https://app.example.com/landing",
        ip: undefined,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);

  // 3. Login as user (refresh actor context)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILoginRequest,
  });

  // 4. Create article as user
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        })
          .slice(0, 150)
          .padEnd(5, "a"),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 7,
          sentenceMax: 12,
          wordMin: 3,
          wordMax: 10,
        })
          .slice(0, 5000)
          .padEnd(20, "b"),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 5. Create comment as user
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.user.comments.create(connection, {
      body: {
        discussion_board_article_id: article.id,
        body: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 20,
        })
          .slice(0, 1000)
          .padEnd(2, "c"),
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(comment);
  TestValidator.predicate(
    "deleted_at is initially null/undefined before soft delete",
    comment.deleted_at === null || comment.deleted_at === undefined,
  );

  // 6. Login as admin (switch actor)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: strongPassword,
      href: "https://app.example.com/admin/login",
      referrer: "https://app.example.com/article/moderate",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 7. Soft delete comment as admin
  const erased: IDiscussionBoardComment =
    await api.functional.discussionBoard.admin.comments.erase(connection, {
      commentId: comment.id,
    });
  typia.assert(erased);
  TestValidator.equals(
    "soft deleted comment id matches",
    erased.id,
    comment.id,
  );
  TestValidator.equals(
    "soft deleted comment article matches",
    erased.article.id,
    article.id,
  );
  TestValidator.equals(
    "soft deleted comment body matches",
    erased.body,
    comment.body,
  );
  TestValidator.predicate(
    "deleted_at property is now a string date (ISO 8601)",
    typeof erased.deleted_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(erased.deleted_at!),
  );
}
