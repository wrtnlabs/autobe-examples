import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates that an authenticated admin can retrieve file upload metadata for a
 * file uploaded by a member.
 *
 * 1. Register a new admin and member (POST /auth/admin/join and
 *    /auth/member/join), log both in.
 * 2. As the member, upload a file using /communityPlatform/member/fileUploads and
 *    capture the returned id.
 * 3. As the admin, invoke /communityPlatform/admin/fileUploads/{fileUploadId} and
 *    assert all metadata is correct and present.
 *
 *    - Uploader, original filename, storage key, MIME type, size, url, status,
 *         created_at, updated_at, deleted_at.
 * 4. Negative case: log out admin, try accessing file upload by id without auth,
 *    verify error thrown.
 * 5. Negative case: as admin, access a random/invalid fileUploadId, verify error
 *    thrown.
 */
export async function test_api_admin_file_upload_detail_view(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. As member, upload a file
  //   member.token.access is set on join; switch connection to member auth
  const fileUploadBody = {
    uploaded_by_member_id: member.id,
    original_filename: `${RandomGenerator.name(2)}.png`,
    storage_key: RandomGenerator.alphaNumeric(20),
    mime_type: "image/png",
    file_size_bytes: 1024,
    url: `https://files.example.com/${RandomGenerator.alphaNumeric(16)}.png`,
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      { body: fileUploadBody },
    );
  typia.assert(fileUpload);

  // 4. Switch connection to admin by re-auth'ing admin (their token is restored)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 5. As authenticated admin, retrieve file upload metadata
  const meta = await api.functional.communityPlatform.admin.fileUploads.at(
    connection,
    {
      fileUploadId: fileUpload.id,
    },
  );
  typia.assert(meta);
  TestValidator.equals(
    "file uploader matches",
    meta.uploaded_by_member_id,
    fileUpload.uploaded_by_member_id,
  );
  TestValidator.equals(
    "file original name matches",
    meta.original_filename,
    fileUpload.original_filename,
  );
  TestValidator.equals(
    "file storage_key matches",
    meta.storage_key,
    fileUpload.storage_key,
  );
  TestValidator.equals(
    "file MIME type matches",
    meta.mime_type,
    fileUpload.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    meta.file_size_bytes,
    fileUpload.file_size_bytes,
  );
  TestValidator.equals("file url matches", meta.url, fileUpload.url);
  TestValidator.equals("file status matches", meta.status, fileUpload.status);
  // Check timestamps and id present
  TestValidator.predicate(
    "file upload id is uuid",
    typeof meta.id === "string" && meta.id.length > 0,
  );
  TestValidator.predicate(
    "file created_at present",
    typeof meta.created_at === "string" && meta.created_at.length > 0,
  );
  TestValidator.predicate(
    "file updated_at present",
    typeof meta.updated_at === "string" && meta.updated_at.length > 0,
  );
  // deleted_at is nullable/optional - do not check presence

  // 6. Negative test: unauthenticated (simulate by clearing token) must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated file upload detail fails",
    async () => {
      await api.functional.communityPlatform.admin.fileUploads.at(unauthConn, {
        fileUploadId: fileUpload.id,
      });
    },
  );

  // 7. Negative test: invalid fileUploadId
  await TestValidator.error("invalid fileUploadId fails", async () => {
    await api.functional.communityPlatform.admin.fileUploads.at(connection, {
      fileUploadId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
