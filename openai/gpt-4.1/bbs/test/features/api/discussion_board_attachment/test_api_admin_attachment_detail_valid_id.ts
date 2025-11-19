import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Validate admin can retrieve full metadata for a specific attachment
 *
 * This test verifies that, after joining as an admin, a request to the
 * /discussionBoard/admin/attachments/{attachmentId} endpoint with a valid UUID
 * returns the complete technical metadata and audit fields for the attachment.
 *
 * 1. Register as an admin to obtain authorization
 * 2. Generate a valid UUID representing an attachment
 * 3. Fetch the detailed metadata for the attachment using the admin endpoint
 * 4. Assert the response matches IDiscussionBoardAttachment and contains all
 *    specified fields
 */
export async function test_api_admin_attachment_detail_valid_id(
  connection: api.IConnection,
) {
  // 1. Register as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://test-discussion-board.com/admin/register",
    referrer: "https://test-discussion-board.com/login",
    // Optional IP
    ip: undefined as undefined,
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Assume an attachment exists (simulate a random UUID)
  const attachmentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Fetch attachment detail as authorized admin
  const result = await api.functional.discussionBoard.admin.attachments.at(
    connection,
    { attachmentId },
  );
  typia.assert(result);

  // 4. Validate all major metadata and audit fields are present
  TestValidator.predicate(
    "attachment has non-empty id",
    typeof result.id === "string" && result.id.length > 0,
  );
  TestValidator.predicate(
    "attachment has non-empty original filename",
    typeof result.original_filename === "string" &&
      result.original_filename.length > 0,
  );
  TestValidator.predicate(
    "attachment has non-empty storage filename",
    typeof result.storage_filename === "string" &&
      result.storage_filename.length > 0,
  );
  TestValidator.predicate(
    "attachment file size is non-negative",
    typeof result.size_bytes === "number" && result.size_bytes >= 0,
  );
  TestValidator.predicate(
    "attachment returns valid mime_type",
    typeof result.mime_type === "string" && result.mime_type.length > 0,
  );
  TestValidator.predicate(
    "attachment returns non-empty sha256 checksum",
    typeof result.checksum_sha256 === "string" &&
      result.checksum_sha256.length > 0,
  );
  TestValidator.predicate(
    "attachment returns storage location string",
    typeof result.storage_location === "string" &&
      result.storage_location.length > 0,
  );
  TestValidator.predicate(
    "attachment created_at is string",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
  TestValidator.predicate(
    "attachment updated_at is string",
    typeof result.updated_at === "string" && result.updated_at.length > 0,
  );
  // deleted_at: may be null/undefined for active attachments
  TestValidator.equals(
    "attachment deleted_at is null or string",
    result.deleted_at === null || typeof result.deleted_at === "string",
    true,
  );
}
