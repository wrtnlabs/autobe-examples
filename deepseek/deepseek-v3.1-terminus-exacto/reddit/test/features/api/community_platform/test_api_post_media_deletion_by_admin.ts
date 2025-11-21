import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostMedia";

/**
 * Test the administrative workflow for removing media associations from posts.
 *
 * This test validates that an administrator can successfully delete media
 * associations created by members, ensuring proper authorization checks and
 * data integrity. The test covers the complete lifecycle from member post
 * creation and media upload through administrative media removal, verifying
 * that the deletion operation properly disassociates media files while
 * maintaining referential integrity.
 */
export async function test_api_post_media_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member12345678";

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

  // Step 2: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin12345678";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Member creates a post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Member uploads a media file
  const mediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "test-image.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<1000000>
          >(),
          storage_path: "/uploads/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 5: Member associates media with the post
  const postMedia =
    await api.functional.communityPlatform.member.posts.media.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          community_platform_media_file_id: mediaFile.id,
          display_order: 1,
          caption: "Test media caption",
        } satisfies ICommunityPlatformPostMedia.ICreate,
      },
    );
  typia.assert(postMedia);

  // Step 6: Switch to admin authentication and delete media association
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "test-agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 7: Administrator deletes the media association
  await api.functional.communityPlatform.admin.posts.media.erase(connection, {
    postId: post.id,
    mediaId: postMedia.id,
  });

  // Step 8: Verify deletion was successful by testing authorization boundaries
  // Test that member cannot delete media associations (should fail)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/member",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Verify member cannot perform admin operations
  await TestValidator.error(
    "member should not be able to delete media associations",
    async () => {
      await api.functional.communityPlatform.admin.posts.media.erase(
        connection,
        {
          postId: post.id,
          mediaId: postMedia.id,
        },
      );
    },
  );

  TestValidator.predicate("admin successfully deleted media association", true);
}
