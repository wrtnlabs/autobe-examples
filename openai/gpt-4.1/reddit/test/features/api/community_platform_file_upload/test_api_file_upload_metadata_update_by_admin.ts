import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate admin metadata update capability on any file upload.
 *
 * 1. Register a unique admin.
 * 2. Register a unique member for file upload.
 * 3. Member uploads a file (with random metadata).
 * 4. (Negative check) Member attempts to update their own file upload using the
 *    admin endpoint and is rejected.
 * 5. Switch to admin session.
 * 6. Admin updates allowed metadata fields (original_filename, status, url) for
 *    the fileUploadId.
 * 7. Validate the update: the returned file object reflects the changed fields;
 *    unmodified fields remain the same.
 * 8. Permission logic: assert only permitted fields changed, file upload is still
 *    associated, and no hidden change in forbidden fields (mime_type,
 *    storage_key, file_size_bytes).
 * 9. (Negative) Try updating non-existent fileUploadId; expect failure.
 * 10. (Negative) Try forbidden status values; expect business error.
 */
export async function test_api_file_upload_metadata_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "testAdminPassword123!",
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "testMemberPassword456!",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Member uploads a file
  const file = await api.functional.communityPlatform.member.fileUploads.create(
    connection,
    {
      body: {
        uploaded_by_member_id: member.id,
        original_filename: RandomGenerator.paragraph({ sentences: 2 }),
        storage_key: RandomGenerator.alphaNumeric(20),
        mime_type: RandomGenerator.pick([
          "image/png",
          "image/jpeg",
          "application/pdf",
          "text/plain",
        ] as const),
        file_size_bytes: typia.random<number & tags.Type<"int32">>(),
        url: `https://test-files.example.com/${RandomGenerator.alphaNumeric(16)}`,
        status: "active",
      } satisfies ICommunityPlatformFileUpload.ICreate,
    },
  );
  typia.assert(file);
  TestValidator.equals(
    "uploaded_by_member_id matches",
    file.uploaded_by_member_id,
    member.id,
  );

  // 4. Negative: Member (not admin!) tries to update via ADMIN endpoint
  await TestValidator.error(
    "member cannot use admin file update endpoint",
    async () => {
      await api.functional.communityPlatform.admin.fileUploads.update(
        connection,
        {
          fileUploadId: file.id,
          body: {
            original_filename: "Illegal member change!",
          },
        },
      );
    },
  );

  // 5. Switch to admin account
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "testAdminPassword123!",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 6. Admin updates metadata
  const updateBody = {
    original_filename: "new-filename-from-admin.txt",
    status: "archived",
    url: `https://test-files.example.com/${RandomGenerator.alphaNumeric(10)}`,
  } satisfies ICommunityPlatformFileUpload.IUpdate;
  const updated =
    await api.functional.communityPlatform.admin.fileUploads.update(
      connection,
      {
        fileUploadId: file.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 7. Validate result: allowed fields changed, unmodifiable fields remain untouched
  TestValidator.equals(
    "original_filename updated",
    updated.original_filename,
    updateBody.original_filename,
  );
  TestValidator.equals("status updated", updated.status, updateBody.status);
  TestValidator.equals("url updated", updated.url, updateBody.url);
  TestValidator.equals(
    "uploaded_by_member_id remains",
    updated.uploaded_by_member_id,
    file.uploaded_by_member_id,
  );
  TestValidator.equals(
    "storage_key unchanged",
    updated.storage_key,
    file.storage_key,
  );
  TestValidator.equals(
    "mime_type unchanged",
    updated.mime_type,
    file.mime_type,
  );
  TestValidator.equals(
    "file_size_bytes unchanged",
    updated.file_size_bytes,
    file.file_size_bytes,
  );

  // 8. Negative: Try updating non-existent fileUploadId
  await TestValidator.error(
    "update non-existent fileUploadId fails",
    async () => {
      await api.functional.communityPlatform.admin.fileUploads.update(
        connection,
        {
          fileUploadId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            original_filename: "ghost-file.txt",
          },
        },
      );
    },
  );

  // 9. Negative: Try status values not business-accepted
  await TestValidator.error("forbidden status value not accepted", async () => {
    await api.functional.communityPlatform.admin.fileUploads.update(
      connection,
      {
        fileUploadId: file.id,
        body: { status: "something-not-allowed" },
      },
    );
  });
}
