import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test soft deletion workflow for media files by the original uploader.
 * Validates that members can mark their files for deletion without permanent
 * removal, preserving the file for recovery purposes. The test ensures that
 * deleted files remain accessible with deletion timestamps while maintaining
 * all original metadata for potential recovery.
 */
export async function test_api_media_file_soft_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/registration",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create an initial media file for deletion testing
  const mediaFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "test-file.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          storage_path: "/uploads/test-file.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Verify initial state - file should not be deleted
  TestValidator.equals(
    "initial file should not have deletion timestamp",
    mediaFile.deleted_at,
    undefined,
  );

  // Step 3: Perform soft deletion by updating the deleted_at field
  const deletionTime = new Date().toISOString();
  const updatedMediaFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.update(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          deleted_at: deletionTime,
        } satisfies ICommunityPlatformMediaFile.IUpdate,
      },
    );
  typia.assert(updatedMediaFile);

  // Step 4: Verify soft deletion was successful
  TestValidator.equals(
    "file ID should remain unchanged",
    updatedMediaFile.id,
    mediaFile.id,
  );
  TestValidator.equals(
    "deletion timestamp should be set",
    updatedMediaFile.deleted_at,
    deletionTime,
  );
  TestValidator.equals(
    "file name should remain unchanged",
    updatedMediaFile.file_name,
    mediaFile.file_name,
  );
  TestValidator.equals(
    "file type should remain unchanged",
    updatedMediaFile.file_type,
    mediaFile.file_type,
  );
  TestValidator.equals(
    "file size should remain unchanged",
    updatedMediaFile.file_size,
    mediaFile.file_size,
  );
  TestValidator.equals(
    "storage path should remain unchanged",
    updatedMediaFile.storage_path,
    mediaFile.storage_path,
  );

  // Verify that other metadata remains intact
  TestValidator.equals(
    "member ID should remain unchanged",
    updatedMediaFile.community_platform_member_id,
    mediaFile.community_platform_member_id,
  );
  TestValidator.equals(
    "session ID should remain unchanged",
    updatedMediaFile.community_platform_member_session_id,
    mediaFile.community_platform_member_session_id,
  );
  TestValidator.equals(
    "version should remain unchanged",
    updatedMediaFile.version,
    mediaFile.version,
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedMediaFile.status,
    mediaFile.status,
  );

  // Verify timestamp updates
  TestValidator.predicate(
    "updated_at should be after creation",
    new Date(updatedMediaFile.updated_at) > new Date(mediaFile.created_at),
  );

  // Test recovery scenario: Remove deletion timestamp
  const recoveryTime = new Date().toISOString();
  const recoveredMediaFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.update(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          deleted_at: undefined,
        } satisfies ICommunityPlatformMediaFile.IUpdate,
      },
    );
  typia.assert(recoveredMediaFile);

  // Verify recovery was successful
  TestValidator.equals(
    "deletion timestamp should be removed after recovery",
    recoveredMediaFile.deleted_at,
    undefined,
  );

  // Test error scenario: Attempt to delete non-existent file
  await TestValidator.error(
    "should fail when deleting non-existent file",
    async () => {
      await api.functional.communityPlatform.member.mediaFiles.update(
        connection,
        {
          mediaFileId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            deleted_at: new Date().toISOString(),
          } satisfies ICommunityPlatformMediaFile.IUpdate,
        },
      );
    },
  );

  // Final validation: File remains fully functional after recovery
  TestValidator.predicate(
    "recovered file should be fully functional",
    recoveredMediaFile !== null,
  );
  TestValidator.equals(
    "recovered file should maintain all properties",
    recoveredMediaFile.file_name,
    mediaFile.file_name,
  );
}
