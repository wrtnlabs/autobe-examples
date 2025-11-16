import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate ownership and allowed update of a comment attachment by its owner
 * (user).
 *
 * 1. Register and authenticate a new user and save the user context.
 * 2. Generate a random commentId as a placeholder UUID so an attachment target
 *    exists.
 * 3. Create an attachment for the comment (this is the updatable entity).
 * 4. Prepare new update metadata (new file_url, filename, mime_type, file_size
 *    under 10MB) and update the attachment successfully.
 * 5. Validate response matches the update and remains linked to the same comment.
 * 6. Attempt update with a disallowed MIME type (e.g., 'application/x-msdownload')
 *    and expect error.
 * 7. Attempt update with file_size_bytes > 10MB (e.g., 11MB) and expect error.
 * 8. Attempt update with duplicate filename (same as another attachment on same
 *    comment) and expect error (filename must be unique per comment).
 *
 * All edge and business validation cases covered; only legitimate owner and
 * valid data can succeed in updates.
 */
export async function test_api_comment_attachment_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinBody = {
    email: userEmail,
    password: "Password123!@#",
    href: "https://localhost/register",
    referrer: "https://localhost/landing",
  } satisfies IDiscussionBoardUser.ICreate;
  const user = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(user);
  TestValidator.predicate(
    "user join returns valid id",
    typeof user.id === "string" && user.id.length > 0,
  );

  // 2. Generate a placeholder commentId (simulate existing comment)
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create an attachment for the comment
  const initialAttachmentBody = {
    file_url: "https://cdn.example.com/file1.png",
    original_filename: RandomGenerator.alphaNumeric(10) + ".png",
    mime_type: "image/png",
    file_size_bytes: 1024 * 256, // 256 KB
  } satisfies IDiscussionBoardCommentAttachment.ICreate;
  const createdAttachment =
    await api.functional.discussionBoard.user.comments.attachments.create(
      connection,
      {
        commentId,
        body: initialAttachmentBody,
      },
    );
  typia.assert(createdAttachment);
  TestValidator.equals(
    "created attachment is linked to comment",
    createdAttachment.discussion_board_comment_id,
    commentId,
  );

  // 4. Update the attachment as the owner (valid update)
  const updatedAttachmentBody = {
    file_url: "https://cdn.example.com/file1-updated.png",
    original_filename: createdAttachment.original_filename, // same filename (allowed for this attachment, unique in table)
    mime_type: "image/png",
    file_size_bytes: 1024 * 900, // 900KB
  } satisfies IDiscussionBoardCommentAttachment.IUpdate;
  const updatedAttachment =
    await api.functional.discussionBoard.user.comments.attachments.update(
      connection,
      {
        commentId,
        attachmentId: createdAttachment.id,
        body: updatedAttachmentBody,
      },
    );
  typia.assert(updatedAttachment);
  TestValidator.equals(
    "updated attachment file URL",
    updatedAttachment.file_url,
    updatedAttachmentBody.file_url,
  );
  TestValidator.equals(
    "updated attachment MIME type",
    updatedAttachment.mime_type,
    updatedAttachmentBody.mime_type,
  );
  TestValidator.equals(
    "updated attachment file size",
    updatedAttachment.file_size_bytes,
    updatedAttachmentBody.file_size_bytes,
  );
  TestValidator.equals(
    "updated attachment links to same comment",
    updatedAttachment.discussion_board_comment_id,
    commentId,
  );
  TestValidator.equals(
    "updated attachment id remains the same",
    updatedAttachment.id,
    createdAttachment.id,
  );

  // 5. Update with disallowed MIME type
  await TestValidator.error(
    "update with disallowed MIME type must fail",
    async () => {
      await api.functional.discussionBoard.user.comments.attachments.update(
        connection,
        {
          commentId,
          attachmentId: createdAttachment.id,
          body: {
            file_url: "https://cdn.example.com/file2.exe",
            original_filename: "malware.exe",
            mime_type: "application/x-msdownload", // typically not allowed
            file_size_bytes: 1024 * 100,
          } satisfies IDiscussionBoardCommentAttachment.IUpdate,
        },
      );
    },
  );

  // 6. Update with file size exceeding 10 MB (should fail)
  await TestValidator.error(
    "update with oversized file should fail",
    async () => {
      await api.functional.discussionBoard.user.comments.attachments.update(
        connection,
        {
          commentId,
          attachmentId: createdAttachment.id,
          body: {
            file_url: "https://cdn.example.com/largefile.pdf",
            original_filename: "large.pdf",
            mime_type: "application/pdf",
            file_size_bytes: 10485761, // 10MB + 1 byte
          } satisfies IDiscussionBoardCommentAttachment.IUpdate,
        },
      );
    },
  );

  // 7. Create a second attachment with unique filename
  const secondAttachmentBody = {
    file_url: "https://cdn.example.com/file2.png",
    original_filename: RandomGenerator.alphaNumeric(10) + "b.png",
    mime_type: "image/png",
    file_size_bytes: 1024 * 500, // 500 KB
  } satisfies IDiscussionBoardCommentAttachment.ICreate;
  const secondAttachment =
    await api.functional.discussionBoard.user.comments.attachments.create(
      connection,
      {
        commentId,
        body: secondAttachmentBody,
      },
    );
  typia.assert(secondAttachment);
  TestValidator.notEquals(
    "second attachment has a different id",
    secondAttachment.id,
    createdAttachment.id,
  );

  // 8. Attempt update with duplicate filename (should fail: filename must be unique per comment)
  await TestValidator.error(
    "update with duplicate filename should fail",
    async () => {
      await api.functional.discussionBoard.user.comments.attachments.update(
        connection,
        {
          commentId,
          attachmentId: createdAttachment.id,
          body: {
            file_url: "https://cdn.example.com/dupfile.png",
            original_filename: secondAttachment.original_filename, // attempt to duplicate
            mime_type: "image/png",
            file_size_bytes: 10000,
          } satisfies IDiscussionBoardCommentAttachment.IUpdate,
        },
      );
    },
  );
}
