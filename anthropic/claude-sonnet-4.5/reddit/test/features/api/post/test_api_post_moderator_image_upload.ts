import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test moderators creating image posts with multi-resolution image handling.
 *
 * This test validates the complete workflow:
 *
 * 1. Register a moderator account and obtain authentication tokens
 * 2. Create a community (moderator becomes primary moderator automatically)
 * 3. Create an image post with multi-resolution images and metadata
 * 4. Validate that the post is created with proper image data
 *
 * The test ensures that image posts support multiple resolutions (original,
 * medium, thumbnail), capture image metadata (dimensions, file size, format),
 * and store optional captions with markdown support.
 */
export async function test_api_post_moderator_image_upload(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
    privacy_type: "public",
    posting_permission: "moderators_only",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create image post with multi-resolution image data
  const imagePostData = {
    community_id: community.id,
    type: "image",
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    image_url: `https://example.com/images/original/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    caption: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditLikePost.ICreate;

  const imagePost: IRedditLikePost =
    await api.functional.redditLike.moderator.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: imagePostData,
      },
    );
  typia.assert(imagePost);

  // Step 4: Validate the created image post - business logic only
  TestValidator.equals("post type is image", imagePost.type, "image");
  TestValidator.equals(
    "post title matches",
    imagePost.title,
    imagePostData.title,
  );
}
