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
 * Test CDN cache optimization scenario focusing on cache status transitions,
 * expiration management, and access tracking.
 */
export async function test_api_admin_media_file_cdn_cache_optimization(
  connection: api.IConnection,
) {
  // Create admin account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Create member account to upload media file
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/upload",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Switch to member context and upload media file
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/upload",
      referrer: "https://example.com/home",
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
          storage_path: "/uploads/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Switch back to admin context for CDN operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com/dashboard",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test-Agent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Create initial CDN distribution
  const initialCdn: ICommunityPlatformMediaCdn =
    await api.functional.communityPlatform.admin.mediaFiles.cdn.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          community_platform_media_file_id: mediaFile.id,
          cdn_provider: "Cloudflare",
          distribution_id: typia.random<string & tags.Format<"uuid">>(),
          edge_locations: "us-east,us-west,eu-central,asia-southeast",
          cache_status: "pending",
        } satisfies ICommunityPlatformMediaCdn.ICreate,
      },
    );
  typia.assert(initialCdn);

  // Test cache optimization with status transitions
  const optimizedCdn: ICommunityPlatformMediaCdn =
    await api.functional.communityPlatform.admin.mediaFiles.cdn.patchByMediafileid(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          cache_status: "cached",
          cache_expiry: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          last_access: new Date().toISOString(),
          access_count: 1,
        } satisfies ICommunityPlatformMediaCdn.IUpdate,
      },
    );
  typia.assert(optimizedCdn);

  // Validate cache status transition
  TestValidator.equals(
    "cache status should transition to cached",
    optimizedCdn.cache_status,
    "cached",
  );
  TestValidator.predicate(
    "access count should be positive",
    optimizedCdn.access_count > 0,
  );

  // Test cache expiration scenario
  const expiredCdn: ICommunityPlatformMediaCdn =
    await api.functional.communityPlatform.admin.mediaFiles.cdn.patchByMediafileid(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          cache_status: "expired",
          cache_expiry: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          access_count: optimizedCdn.access_count + 5,
        } satisfies ICommunityPlatformMediaCdn.IUpdate,
      },
    );
  typia.assert(expiredCdn);

  // Validate expiration handling
  TestValidator.equals(
    "cache status should transition to expired",
    expiredCdn.cache_status,
    "expired",
  );
  TestValidator.predicate(
    "access count should increase",
    expiredCdn.access_count > optimizedCdn.access_count,
  );

  // Test cache refresh workflow
  const refreshedCdn: ICommunityPlatformMediaCdn =
    await api.functional.communityPlatform.admin.mediaFiles.cdn.patchByMediafileid(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          cache_status: "cached",
          cache_expiry: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
          edge_locations: "us-east,us-west,eu-central,asia-southeast,sa-east",
          access_count: expiredCdn.access_count + 10,
        } satisfies ICommunityPlatformMediaCdn.IUpdate,
      },
    );
  typia.assert(refreshedCdn);

  // Final validation of optimization results
  TestValidator.equals(
    "cache should be refreshed to cached state",
    refreshedCdn.cache_status,
    "cached",
  );
  TestValidator.predicate(
    "cache expiry should be in the future",
    new Date(refreshedCdn.cache_expiry) > new Date(),
  );
  TestValidator.predicate(
    "access tracking should work correctly",
    refreshedCdn.access_count > expiredCdn.access_count,
  );
  TestValidator.notEquals(
    "edge locations should be updated",
    refreshedCdn.edge_locations,
    expiredCdn.edge_locations,
  );
}
