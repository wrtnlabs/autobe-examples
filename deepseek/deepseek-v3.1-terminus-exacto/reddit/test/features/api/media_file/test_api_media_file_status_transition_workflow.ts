import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test media file status transitions through the complete workflow: uploaded →
 * processing → optimized.
 *
 * This test validates that media files properly transition through the defined
 * business logic states and that optimization processes correctly update file
 * metadata. The test ensures that status changes follow the defined workflow
 * and that invalid status transitions are properly rejected.
 */
export async function test_api_media_file_status_transition_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create initial media file in uploaded status
  const mediaFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "test-image.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          storage_path: "/uploads/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);
  TestValidator.equals(
    "initial status should be uploaded",
    mediaFile.status,
    "uploaded",
  );

  // Step 3: Update status to processing
  const processingFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.update(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          status: "processing",
        } satisfies ICommunityPlatformMediaFile.IUpdate,
      },
    );
  typia.assert(processingFile);
  TestValidator.equals(
    "status should be processing",
    processingFile.status,
    "processing",
  );
  TestValidator.notEquals(
    "file should be updated",
    processingFile.updated_at,
    mediaFile.updated_at,
  );

  // Step 4: Update status to optimized
  const optimizedFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.update(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          status: "optimized",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.IUpdate,
      },
    );
  typia.assert(optimizedFile);
  TestValidator.equals(
    "status should be optimized",
    optimizedFile.status,
    "optimized",
  );
  TestValidator.notEquals(
    "optimization level should be updated",
    optimizedFile.optimization_level,
    mediaFile.optimization_level,
  );

  // Step 5: Validate workflow completion and metadata consistency
  TestValidator.equals(
    "file ID should remain consistent",
    optimizedFile.id,
    mediaFile.id,
  );
  TestValidator.equals(
    "file name should remain consistent",
    optimizedFile.file_name,
    mediaFile.file_name,
  );
  TestValidator.equals(
    "file type should remain consistent",
    optimizedFile.file_type,
    mediaFile.file_type,
  );
  TestValidator.predicate(
    "optimization level should be valid",
    optimizedFile.optimization_level !== undefined,
  );

  // Step 6: Test invalid status transition (optimized → uploaded)
  await TestValidator.error(
    "should reject invalid status transition from optimized to uploaded",
    async () => {
      await api.functional.communityPlatform.member.mediaFiles.update(
        connection,
        {
          mediaFileId: mediaFile.id,
          body: {
            status: "uploaded",
          } satisfies ICommunityPlatformMediaFile.IUpdate,
        },
      );
    },
  );

  // Step 7: Test failed status transition
  const failedFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.update(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          status: "failed",
        } satisfies ICommunityPlatformMediaFile.IUpdate,
      },
    );
  typia.assert(failedFile);
  TestValidator.equals("status should be failed", failedFile.status, "failed");

  // Step 8: Test invalid transition from failed state
  await TestValidator.error(
    "should reject invalid status transition from failed to processing",
    async () => {
      await api.functional.communityPlatform.member.mediaFiles.update(
        connection,
        {
          mediaFileId: mediaFile.id,
          body: {
            status: "processing",
          } satisfies ICommunityPlatformMediaFile.IUpdate,
        },
      );
    },
  );
}
