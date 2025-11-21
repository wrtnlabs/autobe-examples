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
 * Test the complete workflow for updating media associations within a post
 * created by a member user.
 *
 * This test validates that a member can successfully modify media properties
 * such as display order and caption after creating a post, uploading media
 * files, and establishing media associations. The test ensures proper
 * authorization verification, correct display order sequencing, and caption
 * functionality while maintaining data integrity throughout the update
 * process.
 */
export async function test_api_post_media_update_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post to serve as container for media associations
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Upload media file to be associated with the post
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
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          storage_path: "/uploads/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<90>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 4: Establish initial media association between post and uploaded file
  const initialMediaAssociation =
    await api.functional.communityPlatform.member.posts.media.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          community_platform_media_file_id: mediaFile.id,
          display_order: 1,
          caption: "Initial caption for media file",
        } satisfies ICommunityPlatformPostMedia.ICreate,
      },
    );
  typia.assert(initialMediaAssociation);

  // Step 5: Update the media association with new display order and caption
  const updatedMediaAssociation =
    await api.functional.communityPlatform.member.posts.media.update(
      connection,
      {
        postId: post.id,
        mediaId: initialMediaAssociation.id,
        body: {
          display_order: 2,
          caption: "Updated caption for media file",
        } satisfies ICommunityPlatformPostMedia.IUpdate,
      },
    );
  typia.assert(updatedMediaAssociation);

  // Step 6: Validate the update was successful
  TestValidator.equals(
    "display order should be updated from 1 to 2",
    updatedMediaAssociation.display_order,
    2,
  );
  TestValidator.equals(
    "caption should be updated",
    updatedMediaAssociation.caption,
    "Updated caption for media file",
  );
  TestValidator.equals(
    "post ID should remain unchanged",
    updatedMediaAssociation.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "media file ID should remain unchanged",
    updatedMediaAssociation.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.equals(
    "media association ID should remain the same",
    updatedMediaAssociation.id,
    initialMediaAssociation.id,
  );
}
