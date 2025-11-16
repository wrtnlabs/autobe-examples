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
 * Test detailed retrieval and access control for comment attachment metadata.
 *
 * This test verifies:
 *
 * 1. The authenticated owner of a comment can upload and retrieve their own
 *    comment's attachment metadata, including all required fields.
 * 2. Metadata fields match exactly those returned on upload: id,
 *    discussion_board_comment_id, file_url, original_filename, mime_type,
 *    file_size_bytes, created_at.
 * 3. Only the owner (authenticated session user) can access their own comment
 *    attachment's metadata; a different user is denied access (error
 *    expected).
 * 4. Access with a random attachment ID (not associated to any comment) returns a
 *    safe error.
 *
 * Scenario Steps:
 *
 * 1. Register User A.
 * 2. User A creates one article.
 * 3. User A creates a comment on said article.
 * 4. User A uploads an attachment to their own comment (store attachment ID &
 *    comment ID).
 * 5. User A retrieves attachment metadata (expect full metadata returned, exactly
 *    matching upload values and proper linkage).
 * 6. Register User B.
 * 7. User B attempts to access User A's attachment (expect error: access denied).
 * 8. User A attempts to access an attachment with a random (nonexistent)
 *    attachment ID (expect error: not found or access denied).
 */
export async function test_api_comment_attachment_detail_access_control_and_metadata(
  connection: api.IConnection,
) {
  // 1. Register User A
  const userAPassword = RandomGenerator.alphaNumeric(12);
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userAEmail,
        password: userAPassword,
        href: "https://test.discussion-board.com/join",
        referrer: "https://test.discussion-board.com/landing",
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(userA);

  // 2. User A creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }) as string & tags.MinLength<5> & tags.MaxLength<150>,
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 20,
          sentenceMax: 30,
          wordMin: 3,
          wordMax: 12,
        }) as string & tags.MinLength<20> & tags.MaxLength<5000>,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3. User A creates a comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.user.comments.create(connection, {
      body: {
        discussion_board_article_id: article.id,
        body: RandomGenerator.paragraph({ sentences: 8 }) as string &
          tags.MinLength<2> &
          tags.MaxLength<1000>,
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(comment);

  // 4. User A uploads an attachment to their comment
  const attachmentInput = {
    file_url:
      `https://files.discussion-board.com/${RandomGenerator.alphaNumeric(20)}.png` as string &
        tags.Format<"uri">,
    original_filename: `${RandomGenerator.alphaNumeric(10)}.png`,
    mime_type: "image/png",
    file_size_bytes: 1024 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<10485760>,
  } satisfies IDiscussionBoardCommentAttachment.ICreate;

  const attachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.user.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment id linkage",
    attachment.discussion_board_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "attachment file url matches input",
    attachment.file_url,
    attachmentInput.file_url,
  );
  TestValidator.equals(
    "attachment original filename",
    attachment.original_filename,
    attachmentInput.original_filename,
  );
  TestValidator.equals(
    "attachment mime type",
    attachment.mime_type,
    attachmentInput.mime_type,
  );
  TestValidator.equals(
    "attachment file size",
    attachment.file_size_bytes,
    attachmentInput.file_size_bytes,
  );

  // 5. User A retrieves attachment metadata via GET endpoint
  const found: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.user.comments.attachments.at(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(found);
  TestValidator.equals("GET attachment id", found.id, attachment.id);
  TestValidator.equals(
    "GET attachment comment linkage",
    found.discussion_board_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "GET file url",
    found.file_url,
    attachmentInput.file_url,
  );
  TestValidator.equals(
    "GET original filename",
    found.original_filename,
    attachmentInput.original_filename,
  );
  TestValidator.equals(
    "GET mime type",
    found.mime_type,
    attachmentInput.mime_type,
  );
  TestValidator.equals(
    "GET file size",
    found.file_size_bytes,
    attachmentInput.file_size_bytes,
  );
  TestValidator.predicate(
    "GET returned all metadata fields",
    !!found.created_at &&
      typeof found.created_at === "string" &&
      found.created_at.length > 0,
  );

  // 6. Register User B
  const userBPassword = RandomGenerator.alphaNumeric(12);
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userBEmail,
        password: userBPassword,
        href: "https://test.discussion-board.com/join",
        referrer: "https://test.discussion-board.com/landing",
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(userB);

  // 7. User B attempts to get User A's attachment: expect error (access denied)
  await TestValidator.error(
    "only owner can access their comment attachment",
    async () => {
      await api.functional.discussionBoard.user.comments.attachments.at(
        connection,
        {
          commentId: comment.id,
          attachmentId: attachment.id,
        },
      );
    },
  );

  // 8. User A attempts to access nonexistent attachment ID
  await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
      href: "https://test.discussion-board.com/join",
      referrer: "https://test.discussion-board.com/landing",
    } satisfies IDiscussionBoardUser.ICreate,
  }); // re-authenticate as User A

  await TestValidator.error(
    "not found when accessing random attachment id",
    async () => {
      await api.functional.discussionBoard.user.comments.attachments.at(
        connection,
        {
          commentId: comment.id,
          attachmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
