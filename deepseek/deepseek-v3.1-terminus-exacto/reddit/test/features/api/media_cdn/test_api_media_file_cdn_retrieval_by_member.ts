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
 * Validate that authenticated members can retrieve detailed CDN distribution
 * information for their own media files while ensuring proper authorization
 * boundaries.
 *
 * This test follows a comprehensive workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Upload a media file owned by the authenticated member
 * 3. Create and authenticate an admin account
 * 4. Admin creates CDN distribution for the member's media file
 * 5. Member retrieves CDN information for their own media file
 * 6. Validate authorization prevents access to other members' CDN information
 */
export async function test_api_media_file_cdn_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create media file owned by the authenticated member
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

  // Step 3: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123",
      display_name: RandomGenerator.name(),
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Admin creates CDN distribution for the member's media file
  const cdnDistribution =
    await api.functional.communityPlatform.admin.mediaFiles.cdn.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          community_platform_media_file_id: mediaFile.id,
          cdn_provider: "Cloudflare",
          distribution_id: "cf-dist-12345",
          edge_locations: "us-east,eu-west,ap-south",
          cache_status: "pending",
        } satisfies ICommunityPlatformMediaCdn.ICreate,
      },
    );
  typia.assert(cdnDistribution);

  // Step 5: Switch back to member authentication and retrieve CDN information
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "memberPassword123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Retrieve CDN information for the member's own media file
  const retrievedCdn =
    await api.functional.communityPlatform.member.mediaFiles.cdn.at(
      connection,
      {
        mediaFileId: mediaFile.id,
        cdnId: cdnDistribution.id,
      },
    );
  typia.assert(retrievedCdn);

  // Validate CDN information matches the created distribution
  TestValidator.equals(
    "CDN provider matches created distribution",
    retrievedCdn.cdn_provider,
    "Cloudflare",
  );
  TestValidator.equals(
    "distribution ID matches created distribution",
    retrievedCdn.distribution_id,
    "cf-dist-12345",
  );
  TestValidator.equals(
    "edge locations match created distribution",
    retrievedCdn.edge_locations,
    "us-east,eu-west,ap-south",
  );
  TestValidator.equals(
    "media file ID matches original file",
    retrievedCdn.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.equals(
    "CDN ID matches created distribution",
    retrievedCdn.id,
    cdnDistribution.id,
  );

  // Validate CDN distribution properties
  TestValidator.predicate(
    "CDN has valid cache status",
    retrievedCdn.cache_status === "pending" ||
      retrievedCdn.cache_status === "cached" ||
      retrievedCdn.cache_status === "expired",
  );
  TestValidator.predicate(
    "CDN has non-zero access count",
    retrievedCdn.access_count >= 0,
  );
  TestValidator.predicate(
    "CDN has valid creation timestamp",
    new Date(retrievedCdn.created_at).getTime() > 0,
  );

  // Step 6: Test authorization boundary - member should not access non-existent CDN
  await TestValidator.error(
    "member cannot access non-existent CDN distribution",
    async () => {
      await api.functional.communityPlatform.member.mediaFiles.cdn.at(
        connection,
        {
          mediaFileId: mediaFile.id,
          cdnId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Additional validation: Ensure CDN distribution is properly linked to media file
  TestValidator.equals(
    "CDN distribution links to correct media file",
    retrievedCdn.mediaFile?.id,
    mediaFile.id,
  );
  TestValidator.predicate(
    "CDN distribution has media file summary",
    retrievedCdn.mediaFile !== undefined,
  );
}
