import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate successful upload of a member file and correct metadata association.
 *
 * 1. Register a new member with unique credentials.
 * 2. Use the acquired context to perform an authenticated file upload as this
 *    member.
 * 3. Provide valid file metadata, ensuring size, MIME type, and naming comply with
 *    realistic expectations.
 * 4. Confirm the result's metadata: (a) the uploaded_by_member_id matches the
 *    member's id; (b) all properties—original_filename, mime_type, status,
 *    storage_key, url—exist and correspond to the input or valid
 *    system-generated values; (c) file_size_bytes is correct; (d) status is
 *    'active' or a valid system value.
 * 5. Confirm the returned object is a valid ICommunityPlatformFileUpload and is
 *    linked to the uploading member's id. Do not violate platform-imposed rate
 *    limits, size, or type constraints.
 */
export async function test_api_file_upload_member_success_and_metadata_validation(
  connection: api.IConnection,
) {
  // 1. Register a new member and get authorization
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformMember.ICreate;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberInput });
  typia.assert(member);

  // 2. Compose a valid file upload request (simulate typical image upload)
  const fileInput = {
    uploaded_by_member_id: member.id,
    original_filename: RandomGenerator.name(2) + ".png",
    storage_key: "member-uploads/" + RandomGenerator.alphaNumeric(16),
    mime_type: "image/png",
    file_size_bytes: 204800,
    url:
      "https://cdn.example.com/member-uploads/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;

  // 3. Upload the file as this member
  const fileRecord: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      { body: fileInput },
    );
  typia.assert(fileRecord);

  // 4. Validate upload metadata and relationship
  TestValidator.equals(
    "uploading member ID matches",
    fileRecord.uploaded_by_member_id,
    member.id,
  );
  TestValidator.equals(
    "original filename matches input",
    fileRecord.original_filename,
    fileInput.original_filename,
  );
  TestValidator.equals(
    "mime type matches input",
    fileRecord.mime_type,
    fileInput.mime_type,
  );
  TestValidator.equals(
    "storage key matches input",
    fileRecord.storage_key,
    fileInput.storage_key,
  );
  TestValidator.equals(
    "file size matches",
    fileRecord.file_size_bytes,
    fileInput.file_size_bytes,
  );
  TestValidator.equals(
    "status matches input",
    fileRecord.status,
    fileInput.status,
  );
  TestValidator.predicate(
    "URL looks correct",
    typeof fileRecord.url === "string" && fileRecord.url.length > 0,
  );
  TestValidator.predicate(
    "record ID is uuid",
    typeof fileRecord.id === "string" && fileRecord.id.length === 36,
  );
  TestValidator.predicate(
    "upload timestamps are ISO strings",
    typeof fileRecord.created_at === "string" &&
      typeof fileRecord.updated_at === "string",
  );
}
