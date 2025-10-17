import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates admin file upload deletion and system cleanup cascade.
 *
 * This E2E test covers the critical system-level workflow to ensure that only
 * admins can erase a file upload and that all referential/cascade cleanup rules
 * are correct. The process includes:
 *
 * 1. Registering an admin (to test permissions and session).
 * 2. Registering a regular member account (the uploader).
 * 3. Member uploads a file to the platform (acquire a valid fileUploadId).
 * 4. Admin deletes this file upload using the admin endpoint.
 * 5. Confirm the file cannot be referenced anymore (look for status change or soft
 *    deletion) and does not exist for member queries.
 * 6. Ensure any post-deletion access or deletion of a file still referenced as a
 *    key entity (if such logic exists) fails gracefully with proper informative
 *    error.
 * 7. Confirm audit/event logging for the deletion if accessible.
 *
 * This test should validate referential cascade/deletion logic and proper admin
 * privilege requirements.
 */
export async function test_api_file_upload_admin_deletion_cleanup_cascade(
  connection: api.IConnection,
) {
  // 1. Register admin for authorization on deletion endpoint
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "TestAdmin_1234!",
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);
  // 2. Register normal member (uploader)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestMember_5678!",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  // 3. Member uploads a file: Acquire fileUploadId
  const fileUploadInput = {
    uploaded_by_member_id: member.id,
    original_filename: RandomGenerator.name(2) + ".png",
    storage_key: RandomGenerator.alphaNumeric(24),
    mime_type: "image/png",
    file_size_bytes: typia.random<number & tags.Type<"int32">>(),
    url: `https://files.cdn.example.com/${RandomGenerator.alphaNumeric(16)}.png`,
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const fileUpload: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: fileUploadInput,
      },
    );
  typia.assert(fileUpload);
  TestValidator.equals(
    "uploader ID matches",
    fileUpload.uploaded_by_member_id,
    member.id,
  );
  TestValidator.equals(
    "original filename matches",
    fileUpload.original_filename,
    fileUploadInput.original_filename,
  );

  // 4. Switch to admin user for deletion
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "TestAdmin_1234!",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  // 5. Admin deletes the file upload
  await api.functional.communityPlatform.admin.fileUploads.erase(connection, {
    fileUploadId: fileUpload.id,
  });
  // 6. Attempt to delete the same file again: should error (already deleted or not found)
  await TestValidator.error(
    "deleting already erased fileUploadId should fail",
    async () => {
      await api.functional.communityPlatform.admin.fileUploads.erase(
        connection,
        {
          fileUploadId: fileUpload.id,
        },
      );
    },
  );
  // 7. (If cascade logic existed:) Could check post images, community banners, etc., referencing the file are updated, but no such endpoints are provided.
  // Additional: cleanly handle any deletion of files that should not be deletable (simulate by not referencing these entities directly here as API is limited)
}
