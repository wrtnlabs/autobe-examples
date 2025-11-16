import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that an authenticated user can create comment attachments, enforcing
 * business rules (type, size, max 2 attachments, filename uniqueness, allowed
 * MIME types).
 *
 * Steps:
 *
 * 1. Register and authenticate a discussion board user
 * 2. Use a random UUID to represent an existing comment (simulate, as comment
 *    creation API is not available)
 * 3. Submit a valid attachment creation with correct metadata
 *
 *    - File_url: Valid URI
 *    - Original_filename: Random name, min length 1
 *    - Mime_type: Supported type, e.g. 'image/png' or 'application/pdf'
 *    - File_size_bytes: Between 1 and 10MB (use edge case values for coverage)
 * 4. Validate the response is properly linked to the given comment with all
 *    metadata present and correct
 * 5. Attempt to create a second attachment (should succeed, still <= 2 per
 *    comment)
 * 6. Attempt to create a third attachment (should fail with business rule
 *    violation)
 * 7. Attempt to create an attachment with a duplicate filename (should fail with
 *    uniqueness constraint)
 * 8. Attempt to create an attachment with unsupported MIME type (should fail with
 *    business rule enforcement)
 * 9. Attempt to create an attachment with file size > 10MB (should fail with
 *    business rule enforcement)
 * 10. Attempt to create an attachment with file size of 0 bytes (should fail with
 *     business rule enforcement)
 * 11. Verify all business constraints: max 2 per comment, allowed types, valid
 *     size, unique filename per comment
 */
export async function test_api_comment_attachment_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user
  const userJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardUser.ICreate;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: userJoinInput,
  });
  typia.assert(userAuth);

  // 2. Prepare a random comment UUID (simulating pre-existing comment)
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Valid first attachment
  const validAttachment1 = {
    file_url: typia.random<string & tags.Format<"uri">>(),
    original_filename: RandomGenerator.alphabets(10),
    mime_type: RandomGenerator.pick([
      "image/png",
      "image/jpeg",
      "application/pdf",
      "text/plain",
    ] as const),
    file_size_bytes: 1048576, // 1 MiB
  } satisfies IDiscussionBoardCommentAttachment.ICreate;
  const attachment1 =
    await api.functional.discussionBoard.user.comments.attachments.create(
      connection,
      {
        commentId,
        body: validAttachment1,
      },
    );
  typia.assert(attachment1);
  TestValidator.equals(
    "comment linkage",
    attachment1.discussion_board_comment_id,
    commentId,
  );
  TestValidator.equals(
    "filename matches",
    attachment1.original_filename,
    validAttachment1.original_filename,
  );
  TestValidator.equals(
    "mime_type matches",
    attachment1.mime_type,
    validAttachment1.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    attachment1.file_size_bytes,
    validAttachment1.file_size_bytes,
  );
  TestValidator.predicate(
    "metadata: id is uuid",
    typeof attachment1.id === "string" && attachment1.id.length > 0,
  );
  TestValidator.predicate(
    "creation timestamp",
    typeof attachment1.created_at === "string" &&
      attachment1.created_at.length > 0,
  );

  // 5. Valid second attachment (should still succeed)
  const validAttachment2 = {
    file_url: typia.random<string & tags.Format<"uri">>(),
    original_filename: RandomGenerator.alphabets(12),
    mime_type: RandomGenerator.pick([
      "image/png",
      "image/jpeg",
      "application/pdf",
      "text/plain",
    ] as const),
    file_size_bytes: 4096000, // 4 MiB
  } satisfies IDiscussionBoardCommentAttachment.ICreate;
  const attachment2 =
    await api.functional.discussionBoard.user.comments.attachments.create(
      connection,
      {
        commentId,
        body: validAttachment2,
      },
    );
  typia.assert(attachment2);
  TestValidator.predicate(
    "second attachment created",
    typeof attachment2.id === "string" && attachment2.id.length > 0,
  );

  // 6. Third attachment attempt (should fail: over max per comment)
  const validAttachment3 = {
    file_url: typia.random<string & tags.Format<"uri">>(),
    original_filename: RandomGenerator.alphabets(14),
    mime_type: RandomGenerator.pick([
      "image/png",
      "image/jpeg",
      "application/pdf",
      "text/plain",
    ] as const),
    file_size_bytes: 1048576, // 1 MiB
  } satisfies IDiscussionBoardCommentAttachment.ICreate;
  await TestValidator.error(
    "cannot upload more than 2 attachments per comment",
    async () => {
      await api.functional.discussionBoard.user.comments.attachments.create(
        connection,
        {
          commentId,
          body: validAttachment3,
        },
      );
    },
  );

  // 7. Duplicate filename for same comment (should fail, filename must be unique per comment)
  await TestValidator.error("duplicate filename rejected", async () => {
    await api.functional.discussionBoard.user.comments.attachments.create(
      connection,
      {
        commentId,
        body: {
          ...validAttachment1,
          file_url: typia.random<string & tags.Format<"uri">>(), // new URL, but duplicate name
        },
      },
    );
  });

  // 8. Unsupported MIME type
  await TestValidator.error("unsupported mime type rejected", async () => {
    await api.functional.discussionBoard.user.comments.attachments.create(
      connection,
      {
        commentId,
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          original_filename: RandomGenerator.alphabets(8),
          mime_type: "video/mp4", // not allowed
          file_size_bytes: 5000,
        },
      },
    );
  });

  // 9. Oversize file: over 10MB
  await TestValidator.error("oversize file rejected", async () => {
    await api.functional.discussionBoard.user.comments.attachments.create(
      connection,
      {
        commentId,
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          original_filename: RandomGenerator.alphabets(6),
          mime_type: RandomGenerator.pick([
            "image/png",
            "image/jpeg",
            "application/pdf",
            "text/plain",
          ] as const),
          file_size_bytes: 10485761, // just above 10MB
        },
      },
    );
  });

  // 10. Zero-byte file (below min)
  await TestValidator.error("zero-byte file rejected", async () => {
    await api.functional.discussionBoard.user.comments.attachments.create(
      connection,
      {
        commentId,
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          original_filename: RandomGenerator.alphabets(7),
          mime_type: RandomGenerator.pick([
            "image/png",
            "image/jpeg",
            "application/pdf",
            "text/plain",
          ] as const),
          file_size_bytes: 0,
        },
      },
    );
  });
}
