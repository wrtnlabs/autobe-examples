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
 * Test complete workflow for updating an existing CDN distribution
 * configuration.
 *
 * This E2E test validates the entire CDN management lifecycle: admin creates
 * account, member uploads media file, admin creates initial CDN distribution,
 * then admin updates the distribution with new settings. The test ensures that
 * cache policies, edge locations, and provider configurations can be modified
 * after initial creation while maintaining proper authentication and
 * authorization boundaries.
 */
export async function test_api_cdn_distribution_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for CDN management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "cdn_manager",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account for media file upload
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

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

  // Step 3: Member uploads media file
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/upload",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

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
          storage_path: "/uploads/images/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 4: Switch to admin account and create initial CDN distribution
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

  const initialCdn: ICommunityPlatformMediaCdn =
    await api.functional.communityPlatform.admin.mediaFiles.cdn.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          community_platform_media_file_id: mediaFile.id,
          cdn_provider: "Cloudflare",
          distribution_id: "dist-initial-123",
          edge_locations: "us-east-1,eu-west-1,ap-southeast-1",
          cache_status: "pending",
        } satisfies ICommunityPlatformMediaCdn.ICreate,
      },
    );
  typia.assert(initialCdn);

  // Validate initial CDN distribution
  TestValidator.equals(
    "initial CDN provider should be Cloudflare",
    initialCdn.cdn_provider,
    "Cloudflare",
  );
  TestValidator.equals(
    "initial distribution ID should match",
    initialCdn.distribution_id,
    "dist-initial-123",
  );
  TestValidator.equals(
    "initial edge locations should be set",
    initialCdn.edge_locations,
    "us-east-1,eu-west-1,ap-southeast-1",
  );
  TestValidator.equals(
    "initial cache status should be pending",
    initialCdn.cache_status,
    "pending",
  );

  // Step 5: Update CDN distribution with new configuration
  const updatedCdn: ICommunityPlatformMediaCdn =
    await api.functional.communityPlatform.admin.mediaFiles.cdn.putByMediafileidAndCdnid(
      connection,
      {
        mediaFileId: mediaFile.id,
        cdnId: initialCdn.id,
        body: {
          cdn_provider: "AWS CloudFront",
          distribution_id: "dist-updated-456",
          edge_locations: "us-west-2,eu-central-1,ap-northeast-1,sa-east-1",
          cache_status: "cached",
          cache_expiry: new Date(Date.now() + 3600000).toISOString(),
          last_access: new Date().toISOString(),
          access_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies ICommunityPlatformMediaCdn.IUpdate,
      },
    );
  typia.assert(updatedCdn);

  // Step 6: Validate that CDN distribution was properly updated
  TestValidator.equals(
    "CDN provider should be updated to AWS CloudFront",
    updatedCdn.cdn_provider,
    "AWS CloudFront",
  );
  TestValidator.equals(
    "distribution ID should be updated",
    updatedCdn.distribution_id,
    "dist-updated-456",
  );
  TestValidator.equals(
    "edge locations should be updated",
    updatedCdn.edge_locations,
    "us-west-2,eu-central-1,ap-northeast-1,sa-east-1",
  );
  TestValidator.equals(
    "cache status should be updated to cached",
    updatedCdn.cache_status,
    "cached",
  );
  TestValidator.notEquals(
    "cache expiry should be different from initial",
    updatedCdn.cache_expiry,
    initialCdn.cache_expiry,
  );
  TestValidator.notEquals(
    "last access should be different from initial",
    updatedCdn.last_access,
    initialCdn.last_access,
  );
  TestValidator.notEquals(
    "access count should be different from initial",
    updatedCdn.access_count,
    initialCdn.access_count,
  );
  TestValidator.equals(
    "media file ID should remain unchanged",
    updatedCdn.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.equals(
    "CDN ID should remain unchanged",
    updatedCdn.id,
    initialCdn.id,
  );
}
