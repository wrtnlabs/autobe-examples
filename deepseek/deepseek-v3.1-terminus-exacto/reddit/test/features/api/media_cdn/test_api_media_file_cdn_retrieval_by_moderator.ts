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
 * Test that authenticated moderators can retrieve CDN distribution information
 * for media files within their moderation scope.
 *
 * This test validates moderator access to CDN configuration details including
 * provider settings, cache management, and distribution metrics. It ensures
 * moderators can access CDN information for content moderation purposes while
 * maintaining proper authorization boundaries.
 *
 * Test Steps:
 *
 * 1. Create member account and authenticate
 * 2. Upload a media file as the member
 * 3. Create moderator account and authenticate
 * 4. Create CDN distribution for the media file
 * 5. Retrieve CDN information using moderator credentials
 * 6. Validate CDN configuration details match expectations
 */
export async function test_api_media_file_cdn_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";

  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/upload",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // Authenticate as member for file upload
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/upload",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

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
          storage_path: "/uploads/images/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 3: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderatorJoin);

  // Authenticate as moderator for CDN operations
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 4: Create CDN distribution for the media file
  const cdnDistribution =
    await api.functional.communityPlatform.moderator.mediaFiles.cdn.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          community_platform_media_file_id: mediaFile.id,
          cdn_provider: "Cloudflare",
          distribution_id: "dist-123456789",
          edge_locations: "us-east-1,eu-west-1,ap-southeast-1",
          cache_status: "pending",
        } satisfies ICommunityPlatformMediaCdn.ICreate,
      },
    );
  typia.assert(cdnDistribution);

  // Step 5: Retrieve CDN information using moderator credentials
  const retrievedCdn =
    await api.functional.communityPlatform.moderator.mediaFiles.cdn.at(
      connection,
      {
        mediaFileId: mediaFile.id,
        cdnId: cdnDistribution.id,
      },
    );
  typia.assert(retrievedCdn);

  // Step 6: Validate CDN configuration details
  TestValidator.equals(
    "CDN ID matches created distribution",
    retrievedCdn.id,
    cdnDistribution.id,
  );
  TestValidator.equals(
    "CDN provider matches",
    retrievedCdn.cdn_provider,
    "Cloudflare",
  );
  TestValidator.equals(
    "distribution ID matches",
    retrievedCdn.distribution_id,
    "dist-123456789",
  );
  TestValidator.equals(
    "edge locations match",
    retrievedCdn.edge_locations,
    "us-east-1,eu-west-1,ap-southeast-1",
  );
  TestValidator.equals(
    "cache status is pending",
    retrievedCdn.cache_status,
    "pending",
  );
  TestValidator.equals(
    "media file ID association correct",
    retrievedCdn.community_platform_media_file_id,
    mediaFile.id,
  );

  // Additional validation: Ensure access count is properly initialized
  TestValidator.predicate(
    "access count should be zero initially",
    retrievedCdn.access_count === 0,
  );

  // Validate timestamp fields are present
  TestValidator.predicate(
    "created_at timestamp should be set",
    retrievedCdn.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp should be set",
    retrievedCdn.updated_at !== undefined,
  );
}
