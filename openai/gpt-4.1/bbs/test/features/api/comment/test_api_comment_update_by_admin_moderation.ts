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
 * Validates that an admin can update a user's comment for moderation.
 *
 * - Registers a new admin and a new user.
 * - The user creates an article and then a comment under that article.
 * - The admin logs in and updates the user's comment.
 * - Asserts:
 *
 *   - The comment body is updated as expected.
 *   - The updated_at timestamp is refreshed and different from the original.
 *   - The business rule for content (2-1000 chars) is respected.
 *   - The comment is not soft-deleted.
 *   - The authorship remains unchanged after moderation.
 */
export async function test_api_comment_update_by_admin_moderation(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://board-admin-join.example.com",
    referrer: "https://board.example.com",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    href: "https://board-user-join.example.com",
    referrer: "https://board.example.com",
  } satisfies IDiscussionBoardUser.ICreate;
  const user = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(user);

  // 3. User login to get user context for future calls
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILoginRequest,
  });

  // 4. User creates an article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6 }), // min 5 chars
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: articleBody,
    },
  );
  typia.assert(article);

  // 5. User creates a comment for the article
  const commentText = RandomGenerator.paragraph({ sentences: 8 });
  const commentCreateBody = {
    discussion_board_article_id: article.id,
    body: commentText,
  } satisfies IDiscussionBoardComment.ICreate;
  const comment = await api.functional.discussionBoard.user.comments.create(
    connection,
    {
      body: commentCreateBody,
    },
  );
  typia.assert(comment);

  // Store original values for later comparison
  const originalBody = comment.body;
  const originalUpdatedAt = comment.updated_at;
  const originalCreatedAt = comment.created_at;
  const originalAuthor = comment.author;
  const commentId = comment.id;

  // 6. Admin login to switch context to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://board-admin-login.example.com",
      referrer: "https://board.example.com",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 7. Admin updates the comment body
  const updatedBody = RandomGenerator.paragraph({ sentences: 10 });
  const updateCommentBody = {
    body: updatedBody,
  } satisfies IDiscussionBoardComment.IUpdate;
  const updatedComment =
    await api.functional.discussionBoard.admin.comments.update(connection, {
      commentId: commentId,
      body: updateCommentBody,
    });
  typia.assert(updatedComment);

  // 8. Validate that the body is updated
  TestValidator.equals(
    "comment body is updated by admin",
    updatedComment.body,
    updatedBody,
  );

  // 9. Validate that updated_at is changed but created_at remains the same
  TestValidator.predicate(
    "updated_at must be refreshed by admin moderation",
    updatedComment.updated_at !== originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at remains unchanged after comment moderation",
    updatedComment.created_at,
    originalCreatedAt,
  );

  // 10. Validate that the new body respects business rules (2-1000 chars)
  TestValidator.predicate(
    "comment body length after moderation must be 2-1000 chars",
    updatedComment.body.length >= 2 && updatedComment.body.length <= 1000,
  );

  // 11. Validate that deleted_at is null or undefined (not soft-deleted)
  TestValidator.equals(
    "comment is not soft-deleted after admin moderation",
    updatedComment.deleted_at,
    null,
  );

  // 12. The original author (user) remains unchanged after moderation
  TestValidator.equals(
    "author remains the same after admin update",
    updatedComment.author,
    originalAuthor,
  );
}
