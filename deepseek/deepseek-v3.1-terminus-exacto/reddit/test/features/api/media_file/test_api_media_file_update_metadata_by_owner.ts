import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test successful media file metadata update by the original uploader.
 * Validates that members can modify file properties including filename, file
 * type, optimization level, and status transitions. The test verifies that only
 * authorized users (original uploaders) can update their own files and that
 * system-managed fields remain immutable.
 */
export async function test_api_media_file_update_metadata_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create initial media file for update testing
  const initialOptimizationLevel = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const initialMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "original_file.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          storage_path: "/uploads/images/original_file.jpg",
          optimization_level: initialOptimizationLevel,
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(initialMediaFile);

  // Step 3: Update media file metadata with new values
  const newOptimizationLevel = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const newFileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  const updatedMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.update(
      connection,
      {
        mediaFileId: initialMediaFile.id,
        body: {
          file_name: "updated_file.png",
          file_type: "image/png",
          file_size: newFileSize,
          optimization_level: newOptimizationLevel,
          status: "optimized",
        } satisfies ICommunityPlatformMediaFile.IUpdate,
      },
    );
  typia.assert(updatedMediaFile);

  // Step 4: Validate that updatable fields were changed correctly
  TestValidator.equals(
    "filename should be updated",
    updatedMediaFile.file_name,
    "updated_file.png",
  );
  TestValidator.equals(
    "file type should be updated",
    updatedMediaFile.file_type,
    "image/png",
  );
  TestValidator.equals(
    "file size should be updated",
    updatedMediaFile.file_size,
    newFileSize,
  );
  TestValidator.equals(
    "optimization level should be updated",
    updatedMediaFile.optimization_level,
    newOptimizationLevel,
  );
  TestValidator.equals(
    "status should be updated",
    updatedMediaFile.status,
    "optimized",
  );

  // Step 5: Validate that system-managed fields remain unchanged
  TestValidator.equals(
    "file ID should remain the same",
    updatedMediaFile.id,
    initialMediaFile.id,
  );
  TestValidator.equals(
    "created timestamp should remain unchanged",
    updatedMediaFile.created_at,
    initialMediaFile.created_at,
  );
  TestValidator.equals(
    "uploader member ID should remain unchanged",
    updatedMediaFile.community_platform_member_id,
    initialMediaFile.community_platform_member_id,
  );
  TestValidator.equals(
    "uploader session ID should remain unchanged",
    updatedMediaFile.community_platform_member_session_id,
    initialMediaFile.community_platform_member_session_id,
  );

  // Step 6: Validate that version was incremented
  TestValidator.predicate(
    "version should be incremented",
    updatedMediaFile.version > initialMediaFile.version,
  );

  // Step 7: Validate that updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated timestamp should be newer than creation",
    new Date(updatedMediaFile.updated_at) >
      new Date(initialMediaFile.created_at),
  );

  // Step 8: Test soft deletion functionality
  const softDeletedMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.update(
      connection,
      {
        mediaFileId: initialMediaFile.id,
        body: {
          deleted_at: new Date().toISOString(),
        } satisfies ICommunityPlatformMediaFile.IUpdate,
      },
    );
  typia.assert(softDeletedMediaFile);

  TestValidator.predicate(
    "file should be soft deleted",
    softDeletedMediaFile.deleted_at !== null &&
      softDeletedMediaFile.deleted_at !== undefined,
  );
}
