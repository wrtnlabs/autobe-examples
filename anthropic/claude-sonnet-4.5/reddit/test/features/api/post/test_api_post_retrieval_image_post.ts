import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test retrieval of image-type posts with uploaded images.
 *
 * This test validates the complete workflow of creating and retrieving an image
 * post, ensuring that image posts properly store and return visual content
 * references.
 *
 * Test workflow:
 *
 * 1. Create moderator account for community setup
 * 2. Create a community to host the image post
 * 3. Create member account for posting
 * 4. Submit an image post with title and image_url
 * 5. Retrieve the post and verify image-specific properties
 * 6. Validate that post_type is 'image'
 * 7. Validate that image_url contains the image reference
 * 8. Validate that body and url are null (image posts don't use these fields)
 * 9. Validate complete metadata integrity
 */
export async function test_api_post_retrieval_image_post(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create image post
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });

  const createdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: postTitle,
        post_type: "image",
        body: null,
        url: null,
        image_url: imageUrl,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(createdPost);

  // Step 5: Retrieve the created post
  const retrievedPost = await api.functional.redditCommunity.posts.at(
    connection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(retrievedPost);

  // Step 6: Validate post_type is 'image'
  TestValidator.equals(
    "post_type should be 'image'",
    retrievedPost.post_type,
    "image",
  );

  // Step 7: Validate image_url contains the image reference
  TestValidator.equals(
    "image_url should match the uploaded image URL",
    retrievedPost.image_url,
    imageUrl,
  );

  // Step 8: Validate that body is null for image posts
  TestValidator.equals(
    "body should be null for image posts",
    retrievedPost.body,
    null,
  );

  // Step 9: Validate that url is null for image posts
  TestValidator.equals(
    "url should be null for image posts",
    retrievedPost.url,
    null,
  );

  // Step 10: Validate post metadata
  TestValidator.equals(
    "post title should match",
    retrievedPost.title,
    postTitle,
  );

  TestValidator.equals(
    "post community_id should match",
    retrievedPost.community_id,
    community.id,
  );

  TestValidator.equals(
    "post member_id should match",
    retrievedPost.member_id,
    member.id,
  );

  TestValidator.equals(
    "post edited flag should be false",
    retrievedPost.edited,
    false,
  );

  TestValidator.equals(
    "post deleted_at should be null",
    retrievedPost.deleted_at,
    null,
  );
}
