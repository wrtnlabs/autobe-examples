import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostMedia";

/**
 * Test complete workflow for associating media files with posts created by
 * authenticated members.
 *
 * This E2E test validates the complete media association workflow starting with
 * member registration, media file upload, post creation, and finally
 * associating the media file with the post. The test ensures proper
 * authentication flow, validates display order assignment, caption handling,
 * and relationship integrity between posts and media files.
 */
export async function test_api_post_media_association_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://community-platform.example.com/register",
      referrer: "https://community-platform.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Upload media file to platform storage
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

  // Step 3: Create post that will receive media association
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "media",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Associate media file with post using proper display order and optional caption
  const postMedia =
    await api.functional.communityPlatform.member.posts.media.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          community_platform_media_file_id: mediaFile.id,
          display_order: 1,
          caption: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPostMedia.ICreate,
      },
    );
  typia.assert(postMedia);

  // Step 5: Validate the created association contains correct metadata and relationships
  TestValidator.equals(
    "post media association has correct post ID",
    postMedia.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "post media association has correct media file ID",
    postMedia.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.equals(
    "post media association has correct display order",
    postMedia.display_order,
    1,
  );
  TestValidator.notEquals(
    "post media association has caption",
    postMedia.caption,
    undefined,
  );
  TestValidator.predicate(
    "post media association has creation timestamp",
    postMedia.created_at !== undefined && postMedia.created_at !== null,
  );

  // Validate relationship integrity
  TestValidator.equals(
    "associated post ID matches",
    postMedia.post.id,
    post.id,
  );
  TestValidator.equals(
    "associated media file ID matches",
    postMedia.media_file.id,
    mediaFile.id,
  );

  // Additional validation: Test that display order is properly handled
  TestValidator.predicate(
    "display order is positive integer",
    postMedia.display_order > 0,
  );

  // Test caption length constraints
  if (postMedia.caption) {
    TestValidator.predicate(
      "caption length is reasonable",
      postMedia.caption.length <= 500,
    );
  }
}
