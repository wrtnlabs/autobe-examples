import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Validate successful soft-deletion (mark as deleted) of an attachment by an
 * administrator.
 *
 * This test performs a full soft-deletion workflow:
 *
 * 1. Register a new admin to ensure admin privileges are available.
 * 2. Create a new attachment as the admin with valid file metadata.
 * 3. Issue a DELETE request to mark the attachment as deleted, using its id.
 * 4. Verify that the returned attachment shows a populated deleted_at timestamp
 *    and otherwise matches the original attachment.
 * 5. Confirm that re-deleting the same attachment is properly handled (should
 *    return a logical error, already deleted, forbidden, etc). [Negative test]
 * 6. Optionally, try to query the attachment by id (if such a query endpoint is
 *    supported in the future), and expect it is not returned or is marked as
 *    deleted.
 * 7. Confirm that soft deletion policy is enforced and deletion audit trail is
 *    present in the returned object.
 */
export async function test_api_admin_soft_delete_attachment_success(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin-join.test/",
      referrer: "https://portal.test/",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Create an attachment as admin
  const attachmentInput = {
    original_filename: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    storage_filename: RandomGenerator.alphaNumeric(12),
    size_bytes: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    mime_type: "application/pdf",
    checksum_sha256: RandomGenerator.alphaNumeric(64),
    storage_location: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAttachment.ICreate;
  const attachment =
    await api.functional.discussionBoard.admin.attachments.create(connection, {
      body: attachmentInput,
    });
  typia.assert(attachment);
  TestValidator.equals(
    "original filename matches",
    attachment.original_filename,
    attachmentInput.original_filename,
  );
  TestValidator.equals("not deleted initially", attachment.deleted_at, null);
  // 3. Perform soft deletion
  const erased = await api.functional.discussionBoard.admin.attachments.erase(
    connection,
    {
      attachmentId: attachment.id,
    },
  );
  typia.assert(erased);
  TestValidator.equals("deleted id matches", erased.id, attachment.id);
  TestValidator.notEquals("deleted_at is set", erased.deleted_at, null);
  // 4. Attempt to soft-delete again (should throw error)
  await TestValidator.error("double delete is forbidden", async () => {
    await api.functional.discussionBoard.admin.attachments.erase(connection, {
      attachmentId: attachment.id,
    });
  });
}
