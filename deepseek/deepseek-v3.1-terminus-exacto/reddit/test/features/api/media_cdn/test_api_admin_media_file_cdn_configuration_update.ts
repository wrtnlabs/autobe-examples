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
 * Test complete CDN configuration update workflow including cache management,
 * edge location assignments, and distribution tracking. Admin creates account,
 * member uploads media file, admin creates CDN distribution, then updates cache
 * settings, expiration policies, and performance parameters. Validates CDN
 * optimization workflows and cache management capabilities.
 */
export async function test_api_admin_media_file_cdn_configuration_update(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Switch to member context and upload media file
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/upload",
      referrer: "https://example.com/dashboard",
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
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          storage_path: "/uploads/images/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<90>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 4: Switch back to admin context and create initial CDN distribution
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com/admin/dashboard",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Mozilla/5.0 (Test Client)",
      ip: null,
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
          distribution_id: typia.random<string & tags.Format<"uuid">>(),
          edge_locations: "us-east-1,eu-west-1,ap-southeast-1",
          cache_status: "pending",
        } satisfies ICommunityPlatformMediaCdn.ICreate,
      },
    );
  typia.assert(initialCdn);

  // Step 5: Update CDN configuration with new settings
  const updatedCdn: ICommunityPlatformMediaCdn =
    await api.functional.communityPlatform.admin.mediaFiles.cdn.patchByMediafileid(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          cdn_provider: "AWS CloudFront",
          edge_locations: "us-east-1,us-west-2,eu-central-1,ap-northeast-1",
          cache_status: "cached",
          cache_expiry: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
          access_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
          last_access: new Date().toISOString(),
        } satisfies ICommunityPlatformMediaCdn.IUpdate,
      },
    );
  typia.assert(updatedCdn);

  // Step 6: Validate CDN configuration updates
  TestValidator.equals(
    "CDN provider should be updated",
    updatedCdn.cdn_provider,
    "AWS CloudFront",
  );
  TestValidator.equals(
    "cache status should be updated",
    updatedCdn.cache_status,
    "cached",
  );
  TestValidator.notEquals(
    "edge locations should be different",
    updatedCdn.edge_locations,
    initialCdn.edge_locations,
  );
  TestValidator.predicate(
    "access count should be positive",
    updatedCdn.access_count > 0,
  );
  TestValidator.predicate(
    "last access should be recent",
    new Date(updatedCdn.last_access).getTime() > Date.now() - 60000,
  );

  // Validate CDN distribution integrity
  TestValidator.equals(
    "media file ID should remain consistent",
    updatedCdn.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.equals(
    "CDN ID should remain consistent",
    updatedCdn.id,
    initialCdn.id,
  );
}
