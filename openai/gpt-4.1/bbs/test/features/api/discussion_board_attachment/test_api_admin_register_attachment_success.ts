import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Verify successful registration of technical file metadata as board admin and
 * validation of returned fields.
 *
 * - Create and authenticate a new admin account.
 * - Construct a full and valid attachment metadata request using realistic
 *   generated values:
 *
 *   - Unique original filename (e.g., randomized name + extension)
 *   - Unique storage filename (randomized/unpredictable)
 *   - File size <= 10MB (random int in allowed range)
 *   - MIME type (e.g., 'image/png', from allowed set)
 *   - Unique SHA-256 checksum (random hex string, unique in test scope)
 *   - Valid storage location identifier (random string)
 * - Submit the registration request with all fields.
 * - Assert that the response includes all submitted data and system-managed
 *   fields (id, created_at, updated_at).
 * - Validate UUID, date-time, and all format constraints using typia.assert(); no
 *   further per-field checks needed.
 * - Confirm that another registration with the same checksum (deduplication)
 *   fails with error assertion.
 * - Confirm that attempts with clearly invalid MIME type or excessive file size
 *   are rejected (validation error assertions).
 * - Do not attempt type error tests or missing required fields (leave out those
 *   scenarios as they violate TypeScript rules).
 */
export async function test_api_admin_register_attachment_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.example.com/admin-join",
    referrer: "https://test.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // Step 2: Compose valid attachment metadata
  const allowedMimeTypes = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "application/pdf",
  ] as const;
  const originalFilename =
    RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }).replace(/\s+/g, "_") + ".png";
  const storageFilename = RandomGenerator.alphaNumeric(16) + ".dat";
  const sizeBytes = Math.floor(Math.random() * (10 * 1024 * 1024)) + 1;
  const mimeType = RandomGenerator.pick(allowedMimeTypes);
  const checksumSha256 = ArrayUtil.repeat(64, () =>
    RandomGenerator.pick([..."abcdef0123456789"]),
  ).join("");
  const storageLocation = RandomGenerator.alphaNumeric(12);
  const createBody = {
    original_filename: originalFilename,
    storage_filename: storageFilename,
    size_bytes: sizeBytes satisfies number,
    mime_type: mimeType,
    checksum_sha256: checksumSha256,
    storage_location: storageLocation,
  } satisfies IDiscussionBoardAttachment.ICreate;

  // Step 3: Register attachment
  const attachment =
    await api.functional.discussionBoard.admin.attachments.create(connection, {
      body: createBody,
    });
  typia.assert(attachment);
  TestValidator.equals(
    "original filename echoes",
    attachment.original_filename,
    originalFilename,
  );
  TestValidator.equals(
    "storage filename echoes",
    attachment.storage_filename,
    storageFilename,
  );
  TestValidator.equals("size bytes echoes", attachment.size_bytes, sizeBytes);
  TestValidator.equals("mime type echoes", attachment.mime_type, mimeType);
  TestValidator.equals(
    "checksum echoes",
    attachment.checksum_sha256,
    checksumSha256,
  );
  TestValidator.equals(
    "storage location echoes",
    attachment.storage_location,
    storageLocation,
  );
  TestValidator.predicate(
    "system-managed id format",
    typeof attachment.id === "string" && attachment.id.length > 20,
  );
  TestValidator.predicate("created_at present", !!attachment.created_at);
  TestValidator.predicate("updated_at present", !!attachment.updated_at);
  TestValidator.equals(
    "attachment is not deleted",
    attachment.deleted_at,
    null,
  );

  // Step 4: Attempt duplicate checksum
  await TestValidator.error("duplicate checksum triggers error", async () => {
    await api.functional.discussionBoard.admin.attachments.create(connection, {
      body: { ...createBody },
    });
  });

  // Step 5: Attempt with bad MIME type
  await TestValidator.error("invalid MIME type triggers error", async () => {
    await api.functional.discussionBoard.admin.attachments.create(connection, {
      body: { ...createBody, mime_type: "bad/type" },
    });
  });

  // Step 6: Exceed file size (10MB + 1)
  await TestValidator.error("excessive file size triggers error", async () => {
    await api.functional.discussionBoard.admin.attachments.create(connection, {
      body: { ...createBody, size_bytes: 10 * 1024 * 1024 + 1 },
    });
  });
}
