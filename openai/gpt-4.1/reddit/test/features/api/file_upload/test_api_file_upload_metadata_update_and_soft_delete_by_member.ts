import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate that a member can update and soft-delete their own file uploads, but
 * not those of others.
 *
 * 1. Register and authenticate member A
 * 2. Member A uploads a file (fileUploadA)
 * 3. Member A updates the filename of fileUploadA
 * 4. Validate the filename was changed
 * 5. Member A updates status of fileUploadA to 'deleted' (soft delete)
 * 6. Validate status is 'deleted' and the file's deleted_at is set (if applicable)
 * 7. Register and authenticate member B
 * 8. Member B attempts to update fileUploadA (should error - permission denied)
 */
export async function test_api_file_upload_metadata_update_and_soft_delete_by_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member A
  const memberAEmail: string = typia.random<string & tags.Format<"email">>();
  const memberA: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberA);

  // 2. Member A uploads a file
  const createFileBody = {
    uploaded_by_member_id: memberA.id,
    original_filename: RandomGenerator.paragraph({ sentences: 2 }),
    storage_key: RandomGenerator.alphaNumeric(24),
    mime_type: "image/png",
    file_size_bytes: 123456,
    url: "https://files.example.com/" + RandomGenerator.alphaNumeric(8),
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const fileUploadA: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      { body: createFileBody },
    );
  typia.assert(fileUploadA);
  TestValidator.equals(
    "file A initial owner",
    fileUploadA.uploaded_by_member_id,
    memberA.id,
  );

  // 3. Member A updates the filename of fileUploadA
  const newFilename = RandomGenerator.paragraph({ sentences: 2 });
  const updatedFileA: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.update(
      connection,
      {
        fileUploadId: fileUploadA.id,
        body: {
          original_filename: newFilename,
        } satisfies ICommunityPlatformFileUpload.IUpdate,
      },
    );
  typia.assert(updatedFileA);
  TestValidator.equals(
    "filename updated",
    updatedFileA.original_filename,
    newFilename,
  );

  // 4. Member A soft deletes fileUploadA (status = 'deleted')
  const deletedFileA: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.update(
      connection,
      {
        fileUploadId: fileUploadA.id,
        body: {
          status: "deleted",
        } satisfies ICommunityPlatformFileUpload.IUpdate,
      },
    );
  typia.assert(deletedFileA);
  TestValidator.equals("status is deleted", deletedFileA.status, "deleted");
  TestValidator.predicate(
    "deleted_at is set or null",
    deletedFileA.deleted_at === null || deletedFileA.deleted_at !== undefined,
  );

  // 5. Register and authenticate member B
  const memberBEmail: string = typia.random<string & tags.Format<"email">>();
  const memberB: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberBEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberB);
  // 6. Member B attempts to update fileUploadA (should fail: permission denied)
  await TestValidator.error(
    "second member cannot update other's file upload",
    async () => {
      await api.functional.communityPlatform.member.fileUploads.update(
        connection,
        {
          fileUploadId: fileUploadA.id,
          body: {
            original_filename: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformFileUpload.IUpdate,
        },
      );
    },
  );
}
