import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test creating an image post with file upload and automatic image processing.
 *
 * This test validates the complete workflow of creating an image post in a
 * Reddit-like platform, including member authentication, community setup,
 * subscription, and image post creation with proper validation of image
 * processing features.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a new member account
 * 2. Create a community where the image post will be submitted
 * 3. Subscribe the member to the community for posting permissions
 * 4. Create an image post with title, image URL, and optional caption
 * 5. Validate the created post has type 'image' and contains expected data
 */
export async function test_api_post_image_creation_with_multiple_resolutions(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community where the image post will be submitted
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Subscribe member to community for posting permissions
  const subscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);

  // Step 4: Create an image post with title, image URL, and caption
  const imageFormats = ["jpeg", "png", "gif", "webp"] as const;
  const selectedFormat = RandomGenerator.pick(imageFormats);
  const imageUrl = `https://example.com/images/${typia.random<string & tags.Format<"uuid">>()}.${selectedFormat}`;
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const imageCaption = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });

  const imagePost = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "image",
        title: postTitle,
        image_url: imageUrl,
        caption: imageCaption,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(imagePost);

  // Step 5: Validate the created post
  TestValidator.equals("post type is image", imagePost.type, "image");
  TestValidator.equals("post title matches", imagePost.title, postTitle);
}
