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
 * Test the complete workflow for retrieving CDN distribution details for a
 * media file as an administrator. This scenario validates that administrators
 * can access comprehensive CDN configuration information including provider
 * details, cache status, edge locations, and performance metrics.
 */
export async function test_api_admin_media_file_cdn_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account and authenticate to upload media file
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

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

  // Step 2: Upload media file as member to establish ownership
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

  // Step 3: Create admin account and authenticate to configure CDN
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Authenticate as admin with proper session context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test-Agent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 4: Create CDN distribution configuration for the uploaded media file
  const cdnProviders = ["Cloudflare", "AWS CloudFront", "Akamai"] as const;
  const selectedProvider = RandomGenerator.pick(cdnProviders);
  const distributionId = `dist-${RandomGenerator.alphaNumeric(10)}`;
  const edgeLocations = "us-east-1,eu-west-1,ap-south-1,ap-northeast-2";

  const cdnDistribution =
    await api.functional.communityPlatform.admin.mediaFiles.cdn.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          community_platform_media_file_id: mediaFile.id,
          cdn_provider: selectedProvider,
          distribution_id: distributionId,
          edge_locations: edgeLocations,
          cache_status: "pending",
        } satisfies ICommunityPlatformMediaCdn.ICreate,
      },
    );
  typia.assert(cdnDistribution);

  // Step 5: Retrieve CDN distribution details using admin credentials
  const retrievedCdn =
    await api.functional.communityPlatform.admin.mediaFiles.cdn.at(connection, {
      mediaFileId: mediaFile.id,
      cdnId: cdnDistribution.id,
    });
  typia.assert(retrievedCdn);

  // Step 6: Validate that retrieved CDN information matches the created configuration
  TestValidator.equals(
    "CDN provider matches",
    retrievedCdn.cdn_provider,
    selectedProvider,
  );
  TestValidator.equals(
    "distribution ID matches",
    retrievedCdn.distribution_id,
    distributionId,
  );
  TestValidator.equals(
    "edge locations match",
    retrievedCdn.edge_locations,
    edgeLocations,
  );
  TestValidator.equals(
    "media file ID matches",
    retrievedCdn.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.equals(
    "cache status matches",
    retrievedCdn.cache_status,
    "pending",
  );

  // Step 7: Verify all CDN properties including provider, distribution ID, cache status, and edge locations
  TestValidator.predicate(
    "CDN has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedCdn.id,
    ),
  );
  TestValidator.predicate(
    "CDN has valid creation timestamp",
    retrievedCdn.created_at.includes("T") &&
      retrievedCdn.created_at.includes("Z"),
  );
  TestValidator.predicate(
    "CDN has valid update timestamp",
    retrievedCdn.updated_at.includes("T") &&
      retrievedCdn.updated_at.includes("Z"),
  );
  TestValidator.predicate(
    "CDN has valid cache expiry timestamp",
    retrievedCdn.cache_expiry.includes("T") &&
      retrievedCdn.cache_expiry.includes("Z"),
  );
  TestValidator.predicate(
    "CDN access count is valid",
    retrievedCdn.access_count >= 0,
  );
  TestValidator.predicate(
    "CDN last access is timestamp or empty",
    retrievedCdn.last_access === "" || retrievedCdn.last_access.includes("T"),
  );

  // Validate CDN relationship with media file
  TestValidator.predicate(
    "CDN has media file relationship",
    retrievedCdn.mediaFile !== undefined,
  );
  TestValidator.equals(
    "CDN media file ID matches",
    retrievedCdn.mediaFile!.id,
    mediaFile.id,
  );
}
