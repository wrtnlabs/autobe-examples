import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaCdn } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaCdn";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test complete workflow for creating a CDN distribution configuration for a
 * media file. This comprehensive E2E test validates the entire CDN distribution
 * creation process involving multiple actors: an admin creates an administrator
 * account, a member uploads a media file, and finally the admin creates a CDN
 * distribution for that media file. The test ensures proper authentication
 * switching, validates CDN configuration parameters including provider
 * settings, distribution identifiers, and geographic targeting, and verifies
 * that the created CDN distribution is correctly linked to the media file with
 * appropriate cache settings and access tracking.
 */
export async function test_api_cdn_distribution_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for CDN management operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account to upload media files
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/upload",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Member uploads media file that will receive CDN distribution
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

  // Step 4: Switch back to admin authentication using stored plain text password
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/cdn",
      referrer: "https://example.com/admin",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "test-agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Admin creates CDN distribution for the uploaded media file
  const cdnDistribution: ICommunityPlatformMediaCdn =
    await api.functional.communityPlatform.admin.mediaFiles.cdn.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          community_platform_media_file_id: mediaFile.id,
          cdn_provider: "Cloudflare",
          distribution_id: typia.random<string & tags.Format<"uuid">>(),
          edge_locations: "us-east-1,eu-west-1,ap-southeast-1",
          cache_status: "pending",
        } satisfies ICommunityPlatformMediaCdn.ICreate,
      },
    );
  typia.assert(cdnDistribution);

  // Step 6: Validate CDN configuration parameters and relationships
  TestValidator.equals(
    "CDN distribution linked to correct media file",
    cdnDistribution.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.equals(
    "CDN provider is set correctly",
    cdnDistribution.cdn_provider,
    "Cloudflare",
  );
  TestValidator.predicate(
    "distribution ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cdnDistribution.distribution_id,
    ),
  );
  TestValidator.equals(
    "edge locations are properly set",
    cdnDistribution.edge_locations,
    "us-east-1,eu-west-1,ap-southeast-1",
  );
  TestValidator.equals(
    "cache status is pending",
    cdnDistribution.cache_status,
    "pending",
  );
  TestValidator.predicate(
    "access count starts at zero",
    cdnDistribution.access_count === 0,
  );
  TestValidator.predicate(
    "CDN distribution has creation timestamp",
    cdnDistribution.created_at !== undefined &&
      cdnDistribution.created_at.length > 0,
  );
  TestValidator.predicate(
    "CDN distribution has update timestamp",
    cdnDistribution.updated_at !== undefined &&
      cdnDistribution.updated_at.length > 0,
  );
}
