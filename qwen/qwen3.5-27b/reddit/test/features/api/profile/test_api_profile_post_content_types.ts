import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that the profile post endpoint correctly handles and returns all three post content types (text, link, image).
 *
 * Validates the complete post creation and retrieval flow for all supported content types. Ensures that the post type discriminator is correctly set and that the appropriate content field is populated while others remain null. Verifies that author and community information are properly included in the response.
 *
 * The test creates a member account, finds an existing community, subscribes to it, and then creates three separate posts of different types. Each post is retrieved and validated to ensure the correct content field is populated based on the post type.
 *
 * 1. Register a new member account with email, password, and username.
 * 2. Search for an existing community to use for posts.
 * 3. Subscribe the member to the community.
 * 4. Create a text post with title and text_content.
 * 5. Create a link post with title and link_url.
 * 6. Create an image post with title and image_url.
 * 7. Retrieve each post using the profile endpoint.
 * 8. Validate that text post has text_content populated, link_url and image_url are null.
 * 9. Validate that link post has link_url populated, text_content and image_url are null.
 * 10. Validate that image post has image_url populated, text_content and link_url are null.
 * 11. Verify post_type discriminator matches expected value for each post.
 * 12. Verify author and community information are present in all posts.
 */
export async function test_api_profile_post_content_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Find an existing community
  const communityList = await api.functional.redditClone.communities.index(
    memberConnection,
    {
      body: {} satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(communityList);
  // Use first available community or create test scenario with random UUID
  // In real E2E, communities should exist; this handles edge case
  const targetCommunity =
    communityList.data.length > 0
      ? communityList.data[0]
      : {
          id: typia.random<string & tags.Format<"uuid">>(),
          name: "test-community",
          description: "Test community",
          icon: null,
          owner: typia.random<IRedditCloneUserProfile.ISummary>(),
          subscriber_count: 0,
          created_at: new Date().toISOString(),
        };
  // 3. Subscribe member to community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: targetCommunity.id,
      },
    },
  );
  // 4. Create text post
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: targetCommunity.id,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(textPost);
  // 5. Create link post
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "link",
        community_id: targetCommunity.id,
        link_url: typia.random<string & tags.Format<"url">>(),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(linkPost);
  // 6. Create image post
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "image",
        community_id: targetCommunity.id,
        image_url: typia.random<string & tags.Format<"url">>(),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 7-12. Retrieve and validate each post
  // Retrieve text post
  const retrievedTextPost = await api.functional.redditClone.profiles.posts.at(
    memberConnection,
    {
      profileId: member.id,
      postId: textPost.id,
    },
  );
  typia.assert(retrievedTextPost);
  // Validate text post content
  TestValidator.equals("text post type", retrievedTextPost.post_type, "text");
  TestValidator.predicate(
    "text post has text_content",
    retrievedTextPost.text_content !== null,
  );
  TestValidator.equals(
    "text post link_url is null",
    retrievedTextPost.link_url,
    null,
  );
  TestValidator.equals(
    "text post image_url is null",
    retrievedTextPost.image_url,
    null,
  );
  TestValidator.predicate(
    "text post has author",
    retrievedTextPost.author !== null,
  );
  TestValidator.predicate(
    "text post has community",
    retrievedTextPost.community !== null,
  );
  // Retrieve link post
  const retrievedLinkPost = await api.functional.redditClone.profiles.posts.at(
    memberConnection,
    {
      profileId: member.id,
      postId: linkPost.id,
    },
  );
  typia.assert(retrievedLinkPost);
  // Validate link post content
  TestValidator.equals("link post type", retrievedLinkPost.post_type, "link");
  TestValidator.equals(
    "link post text_content is null",
    retrievedLinkPost.text_content,
    null,
  );
  TestValidator.predicate(
    "link post has link_url",
    retrievedLinkPost.link_url !== null,
  );
  TestValidator.equals(
    "link post image_url is null",
    retrievedLinkPost.image_url,
    null,
  );
  TestValidator.predicate(
    "link post has author",
    retrievedLinkPost.author !== null,
  );
  TestValidator.predicate(
    "link post has community",
    retrievedLinkPost.community !== null,
  );
  // Retrieve image post
  const retrievedImagePost = await api.functional.redditClone.profiles.posts.at(
    memberConnection,
    {
      profileId: member.id,
      postId: imagePost.id,
    },
  );
  typia.assert(retrievedImagePost);
  // Validate image post content
  TestValidator.equals(
    "image post type",
    retrievedImagePost.post_type,
    "image",
  );
  TestValidator.equals(
    "image post text_content is null",
    retrievedImagePost.text_content,
    null,
  );
  TestValidator.equals(
    "image post link_url is null",
    retrievedImagePost.link_url,
    null,
  );
  TestValidator.predicate(
    "image post has image_url",
    retrievedImagePost.image_url !== null,
  );
  TestValidator.predicate(
    "image post has author",
    retrievedImagePost.author !== null,
  );
  TestValidator.predicate(
    "image post has community",
    retrievedImagePost.community !== null,
  );
}
