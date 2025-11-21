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
 * Test public retrieval of media associations from posts, validating that media
 * files associated with posts can be accessed without authentication.
 *
 * This test creates a complete media association workflow including member
 * authentication, media upload, post creation, and media association, then
 * verifies that the media association details can be retrieved publicly. It
 * ensures proper metadata display including caption, display order, and file
 * information while confirming that public access respects platform visibility
 * rules.
 */
export async function test_api_post_media_retrieval_public(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Upload media file for association
  const mediaFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "test-image.jpg",
          file_type: "image/jpeg",
          file_size: 1024,
          storage_path: "/uploads/test-image.jpg",
          optimization_level: 80,
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // 3. Create post to hold media association
  // Using a valid UUID format for community ID - the system should handle validation
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "media",
        status: "published", // Published posts should be publicly accessible
        community_platform_community_id: "00000000-0000-0000-0000-000000000000", // Using a valid UUID format
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 4. Associate the media file with the post
  const postMedia: ICommunityPlatformPostMedia =
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

  // 5. Switch to unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 6. Retrieve the media association publicly
  const retrievedMedia: ICommunityPlatformPostMedia =
    await api.functional.communityPlatform.posts.media.at(unauthConn, {
      postId: post.id,
      mediaId: postMedia.id,
    });
  typia.assert(retrievedMedia);

  // 7. Validate that all metadata is correctly accessible
  TestValidator.equals(
    "post ID matches",
    retrievedMedia.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "media file ID matches",
    retrievedMedia.community_platform_media_file_id,
    mediaFile.id,
  );
  TestValidator.equals(
    "display order matches",
    retrievedMedia.display_order,
    1,
  );
  TestValidator.equals(
    "caption matches",
    retrievedMedia.caption,
    "Test media caption",
  );
  TestValidator.equals(
    "post association exists",
    retrievedMedia.post.id,
    post.id,
  );
  TestValidator.equals(
    "media file association exists",
    retrievedMedia.media_file.id,
    mediaFile.id,
  );
}
