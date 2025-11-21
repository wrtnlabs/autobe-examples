import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test the complete media file deletion workflow where a member uploads a media
 * file and then permanently deletes it from the platform storage system.
 *
 * Validates that the deletion operation performs hard deletion, removes the
 * file record from the database, and cleans up associated storage resources.
 * The test should verify that only the file owner can delete their media files
 * and that deletion is irreversible once completed.
 */
export async function test_api_media_file_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account for media file operations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Upload media file that will be deleted in the test
  const mediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "test-image.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          storage_path: "/uploads/test-folder/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 3: Permanently delete the media file
  await api.functional.communityPlatform.member.mediaFiles.erase(connection, {
    mediaFileId: mediaFile.id,
  });

  // Step 4: Verify deletion is irreversible by attempting to access deleted file
  await TestValidator.error(
    "deleted file should not be accessible",
    async () => {
      // Attempt to delete the same file again - should fail since it's already deleted
      await api.functional.communityPlatform.member.mediaFiles.erase(
        connection,
        {
          mediaFileId: mediaFile.id,
        },
      );
    },
  );

  // Step 5: Test ownership validation with a second member
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: "SecondPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(secondMember);

  // Create a file for the second member
  const secondMemberFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "second-member-file.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          storage_path: "/uploads/second-member/second-file.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(secondMemberFile);

  // Switch back to first member context and attempt to delete second member's file
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: member.display_name,
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });

  // Verify that first member cannot delete second member's file
  await TestValidator.error("non-owner cannot delete media file", async () => {
    await api.functional.communityPlatform.member.mediaFiles.erase(connection, {
      mediaFileId: secondMemberFile.id,
    });
  });

  // Switch back to second member to delete their own file
  await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: "SecondPassword123",
      display_name: secondMember.display_name,
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });

  // Second member should be able to delete their own file
  await api.functional.communityPlatform.member.mediaFiles.erase(connection, {
    mediaFileId: secondMemberFile.id,
  });

  // Final validation: Verify second member's file deletion is also irreversible
  await TestValidator.error(
    "second member's deleted file should not be accessible",
    async () => {
      await api.functional.communityPlatform.member.mediaFiles.erase(
        connection,
        {
          mediaFileId: secondMemberFile.id,
        },
      );
    },
  );
}
