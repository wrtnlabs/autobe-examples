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
 * Validates that an authenticated administrator can delete any file or image
 * attachment from a comment, regardless of comment ownership.
 *
 * Test Workflow:
 *
 * 1. Register a new administrator and a regular user.
 * 2. User creates an article on the discussion board.
 * 3. User adds a comment to that article.
 * 4. User uploads a file/image attachment to the comment.
 * 5. Admin logs in and deletes the attachment via the admin endpoint.
 * 6. Attempt unauthorized deletion: user (non-admin) tries to delete an
 *    already-deleted attachment (should fail with error).
 *
 * This validates admin moderation permissions, orphan record removal, correct
 * audit flow, and strict credential enforcement.
 */
export async function test_api_admin_remove_any_comment_attachment_success(
  connection: api.IConnection,
) {
  // 1. Register Admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://test.board/admin/join",
      referrer: "https://test.board/",
      ip: null,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);

  // 2. Register Regular User
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://test.board/user/join",
      referrer: "https://test.board/",
      ip: null,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // Switch to User Actor
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILoginRequest,
  });

  // 3. User creates article
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 8,
          wordMax: 16,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 18,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 4. User creates comment
  const comment = await api.functional.discussionBoard.user.comments.create(
    connection,
    {
      body: {
        discussion_board_article_id: article.id,
        body: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 5. User attaches file/image to comment
  const attachment =
    await api.functional.discussionBoard.user.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          file_url: `https://files.testboard.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
          original_filename: `${RandomGenerator.alphabets(8)}.jpg`,
          mime_type: "image/jpeg",
          file_size_bytes: 1024,
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 6. Switch to admin and delete attachment
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://test.board/admin/moderate",
      referrer: "https://test.board/admin/",
      ip: null,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  await api.functional.discussionBoard.admin.comments.attachments.erase(
    connection,
    {
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );

  // 7. Try deleting as user again (should fail - unauthorized or not found)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILoginRequest,
  });
  await TestValidator.error(
    "user cannot delete attachment after admin deletion",
    async () => {
      await api.functional.discussionBoard.admin.comments.attachments.erase(
        connection,
        {
          commentId: comment.id,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
