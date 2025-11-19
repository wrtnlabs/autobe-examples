import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Validates discussion board admin attachment registration, audit fields, and
 * error cases.
 *
 * 1. Register and authenticate a new admin using /auth/admin/join
 * 2. Register an attachment metadata record using
 *    /discussionBoard/admin/attachments:
 *
 *    - Provide all required fields (original_filename, storage_filename, size_bytes,
 *         mime_type, checksum_sha256, storage_location)
 *    - Assert returned metadata matches input and audit fields (created_at,
 *         updated_at) are set
 * 3. Error - Duplicate checksum: Attempt to register a second attachment with same
 *    checksum_sha256 (should fail as duplicate)
 * 4. Error - Invalid mime_type: Attempt creation with unsupported mime_type (e.g.,
 *    "text/foobar")
 * 5. Error - Missing required field: Omit required property (e.g., no
 *    storage_filename)
 */
export async function test_api_attachment_registration_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://test-discussion-board.example.com/join",
    referrer: "https://test-discussion-board.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);
  TestValidator.equals("admin email is persisted", admin.email, adminEmail);
  TestValidator.predicate(
    "admin id is uuid",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  // 2. Register new attachment
  const checksum = RandomGenerator.alphaNumeric(64);
  const createBody = {
    original_filename: "presentation-deck.pdf",
    storage_filename: RandomGenerator.alphaNumeric(24),
    size_bytes: 1_024_000,
    mime_type: "application/pdf",
    checksum_sha256: checksum,
    storage_location: `/files/uploads/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IDiscussionBoardAttachment.ICreate;
  const attachment =
    await api.functional.discussionBoard.admin.attachments.create(connection, {
      body: createBody,
    });
  typia.assert(attachment);
  TestValidator.equals(
    "original_filename persisted",
    attachment.original_filename,
    createBody.original_filename,
  );
  TestValidator.equals(
    "storage_filename persisted",
    attachment.storage_filename,
    createBody.storage_filename,
  );
  TestValidator.equals(
    "size_bytes persisted",
    attachment.size_bytes,
    createBody.size_bytes,
  );
  TestValidator.equals(
    "mime_type persisted",
    attachment.mime_type,
    createBody.mime_type,
  );
  TestValidator.equals(
    "checksum_sha256 persisted",
    attachment.checksum_sha256,
    createBody.checksum_sha256,
  );
  TestValidator.equals(
    "storage_location persisted",
    attachment.storage_location,
    createBody.storage_location,
  );
  TestValidator.predicate(
    "created_at is set",
    typeof attachment.created_at === "string" &&
      attachment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is set",
    typeof attachment.updated_at === "string" &&
      attachment.updated_at.length > 0,
  );
  // 3. Error - Duplicate checksum: Should reject if checksum_sha256 is reused
  await TestValidator.error(
    "duplicate checksum_sha256 should be rejected",
    async () => {
      await api.functional.discussionBoard.admin.attachments.create(
        connection,
        {
          body: {
            ...createBody,
            storage_filename: RandomGenerator.alphaNumeric(24),
          },
        },
      );
    },
  );
  // 4. Error - Invalid mime_type: Should reject if mime_type is not supported
  await TestValidator.error(
    "unsupported mime_type should be rejected",
    async () => {
      await api.functional.discussionBoard.admin.attachments.create(
        connection,
        {
          body: {
            ...createBody,
            mime_type: "text/foobar",
            storage_filename: RandomGenerator.alphaNumeric(24),
            checksum_sha256: RandomGenerator.alphaNumeric(64),
          },
        },
      );
    },
  );
  // 5. Error - Missing required field: Omit a required property (storage_filename missing)
  await TestValidator.error(
    "missing required property should be rejected",
    async () => {
      // TypeScript prohibits omitting required properties so simulate by setting storage_filename as empty string
      await api.functional.discussionBoard.admin.attachments.create(
        connection,
        {
          body: {
            ...createBody,
            storage_filename: "",
            checksum_sha256: RandomGenerator.alphaNumeric(64),
          },
        },
      );
    },
  );
}
