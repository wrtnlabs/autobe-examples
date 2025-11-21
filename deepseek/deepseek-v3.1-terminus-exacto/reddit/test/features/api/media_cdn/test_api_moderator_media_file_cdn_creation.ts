import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaCdn } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaCdn";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test the complete workflow for creating CDN distribution configurations as a
 * moderator. This scenario validates that moderators can establish CDN
 * distributions for media files they have permission to manage. The test
 * creates a member account to upload a media file, authenticates as a
 * moderator, and successfully creates a CDN configuration with provider
 * settings, distribution identifiers, and geographic targeting.
 */
export async function test_api_moderator_media_file_cdn_creation(
  connection: api.IConnection,
) {
  // Step 1: Create member account to establish ownership
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

  // Step 2: Upload media file as member
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

  // Step 3: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "global",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Authenticate as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Create CDN distribution configuration
  const cdnConfig =
    await api.functional.communityPlatform.moderator.mediaFiles.cdn.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          community_platform_media_file_id: mediaFile.id,
          cdn_provider: "Cloudflare",
          distribution_id: "dist-123456789",
          edge_locations: "us-east-1,eu-west-1,ap-south-1",
          cache_status: "pending",
        } satisfies ICommunityPlatformMediaCdn.ICreate,
      },
    );
  typia.assert(cdnConfig);

  // Step 6: Validate CDN configuration properties
  TestValidator.equals(
    "CDN provider matches requested value",
    cdnConfig.cdn_provider,
    "Cloudflare",
  );
  TestValidator.equals(
    "distribution ID matches requested value",
    cdnConfig.distribution_id,
    "dist-123456789",
  );
  TestValidator.equals(
    "edge locations match requested value",
    cdnConfig.edge_locations,
    "us-east-1,eu-west-1,ap-south-1",
  );
  TestValidator.equals(
    "cache status is set to pending",
    cdnConfig.cache_status,
    "pending",
  );
  TestValidator.equals(
    "CDN configuration is linked to correct media file",
    cdnConfig.community_platform_media_file_id,
    mediaFile.id,
  );

  // Step 7: Verify CDN configuration integrity
  TestValidator.predicate(
    "CDN configuration has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cdnConfig.id,
    ),
  );
  TestValidator.predicate(
    "CDN configuration has valid creation timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cdnConfig.created_at),
  );
  TestValidator.predicate(
    "CDN configuration has valid update timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cdnConfig.updated_at),
  );
  TestValidator.predicate(
    "CDN configuration access count is initialized to zero",
    cdnConfig.access_count === 0,
  );
}
