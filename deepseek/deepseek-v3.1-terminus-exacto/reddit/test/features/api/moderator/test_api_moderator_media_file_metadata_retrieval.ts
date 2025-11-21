import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMediaMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaMetadata";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that moderators can retrieve technical metadata for media files uploaded
 * by members.
 *
 * This comprehensive E2E test validates the complete workflow:
 *
 * 1. Create moderator account with appropriate privileges
 * 2. Create member account to upload test media file
 * 3. Upload media file with realistic metadata
 * 4. Authenticate as moderator to test metadata retrieval
 * 5. Validate moderator can access detailed technical information
 *
 * Ensures moderators have necessary technical context for content moderation
 * while maintaining proper access boundaries between user roles.
 */
export async function test_api_moderator_media_file_metadata_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Upload media file as member
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
          storage_path: "/uploads/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 4: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Retrieve metadata as moderator
  const metadata =
    await api.functional.communityPlatform.moderator.mediaFiles.metadata.at(
      connection,
      {
        mediaFileId: mediaFile.id,
      },
    );
  typia.assert(metadata);

  // Step 6: Validate metadata structure and content
  TestValidator.equals(
    "metadata should have correct media file ID",
    metadata.community_platform_media_file_id,
    mediaFile.id,
  );

  TestValidator.predicate(
    "metadata should have creation timestamp",
    metadata.created_at !== undefined && metadata.created_at.length > 0,
  );

  TestValidator.predicate(
    "metadata should have update timestamp",
    metadata.updated_at !== undefined && metadata.updated_at.length > 0,
  );

  // Additional validation for optional technical fields
  if (metadata.width !== undefined) {
    TestValidator.predicate(
      "width should be positive if present",
      metadata.width > 0,
    );
  }

  if (metadata.height !== undefined) {
    TestValidator.predicate(
      "height should be positive if present",
      metadata.height > 0,
    );
  }

  if (metadata.duration !== undefined) {
    TestValidator.predicate(
      "duration should be positive if present",
      metadata.duration > 0,
    );
  }

  if (metadata.bitrate !== undefined) {
    TestValidator.predicate(
      "bitrate should be positive if present",
      metadata.bitrate > 0,
    );
  }
}
