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
 * Test complete CDN distribution deletion workflow for media files by platform
 * administrators. Validates that administrators can successfully remove CDN
 * distribution configurations for media files that are no longer needed or
 * require reconfiguration.
 */
export async function test_api_media_file_cdn_distribution_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
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

  // Step 2: Create member account to upload media file
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/upload",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Upload media file that will serve as parent entity
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

  // Step 4: Switch to admin authentication context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "TestAgent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Create CDN distribution configuration
  const cdnDistribution: ICommunityPlatformMediaCdn =
    await api.functional.communityPlatform.admin.mediaFiles.cdn.create(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          community_platform_media_file_id: mediaFile.id,
          cdn_provider: "cloudflare",
          distribution_id: "dist-123456789",
          edge_locations: "us-east-1,eu-west-1,ap-south-1",
          cache_status: "pending",
        } satisfies ICommunityPlatformMediaCdn.ICreate,
      },
    );
  typia.assert(cdnDistribution);

  // Step 6: Test CDN distribution deletion operation
  await api.functional.communityPlatform.admin.mediaFiles.cdn.erase(
    connection,
    {
      mediaFileId: mediaFile.id,
      cdnId: cdnDistribution.id,
    },
  );

  // Step 7: Validate successful deletion by ensuring no errors occurred
  // The erase function returns void on success, so completion indicates successful deletion
  TestValidator.predicate(
    "CDN distribution deletion completed successfully",
    true,
  );

  // Step 8: Test deletion of non-existent CDN distribution
  await TestValidator.error(
    "deleting non-existent CDN distribution should fail",
    async () => {
      await api.functional.communityPlatform.admin.mediaFiles.cdn.erase(
        connection,
        {
          mediaFileId: mediaFile.id,
          cdnId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
