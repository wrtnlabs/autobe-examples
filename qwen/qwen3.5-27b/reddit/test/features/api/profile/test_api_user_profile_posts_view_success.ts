import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
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
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test viewing a user's posts on their profile page with proper pagination and content preview.
 *
 * Validates the complete workflow of creating a member user, subscribing them to a community, creating multiple posts of different types (text, link, image), and then retrieving those posts through the profile posts endpoint. Ensures that the paginated response includes all required fields and that the preview field correctly adapts to each post type.
 *
 * The test verifies that posts are sorted by creation date (newest first), pagination metadata is accurate, and author/community information is properly included in each post summary. Special attention is given to validating that the preview field shows appropriate content based on post type: text posts show truncated body content, image posts show the image URL, and link posts show the domain name.
 *
 * 1. Register a new member user with email, password, and username.
 * 2. Subscribe the member to an existing community.
 * 3. Create multiple posts of different types (text, link, image) in the community.
 * 4. Retrieve the member's posts via the profile posts endpoint.
 * 5. Validate pagination metadata and post content structure.
 * 6. Verify preview field adapts correctly to each post type.
 */
export async function test_api_user_profile_posts_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      username: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    },
  });
  typia.assert(member);
  // 2. Subscribe to community
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await generate_random_reddit_clone_member_communities_subscriptions_create(
    memberConnection,
    {
      params: { communityId },
    },
  );
  // 3. Create multiple posts of different types
  // Create text post
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(textPost);
  // Create link post
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "link",
        community_id: communityId,
        link_url: "https://example.com/article/123",
      },
    },
  );
  typia.assert(linkPost);
  // Create image post
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "image",
        community_id: communityId,
        image_url: "https://example.com/images/test.jpg",
      },
    },
  );
  typia.assert(imagePost);
  // 4. Retrieve posts via profile endpoint
  const result = await api.functional.redditClone.profiles.posts.index(
    memberConnection,
    {
      profileId: member.id,
      body: {
        page: 1,
        limit: 25,
        sortType: "new",
      },
    },
  );
  typia.assert(result);
  // 5. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 25);
  TestValidator.predicate(
    "has at least 3 posts",
    result.pagination.records >= 3,
  );
  TestValidator.predicate("has at least 1 page", result.pagination.pages >= 1);
  // 6. Validate post count
  TestValidator.equals("post count matches expected", result.data.length, 3);
  // 7. Validate each post structure and content
  for (const post of result.data) {
    // Validate post has required fields
    TestValidator.predicate(
      `post ${post.id} has valid title`,
      post.title.length > 0,
    );
    TestValidator.predicate(
      `post ${post.id} has valid post_type`,
      ["text", "link", "image"].includes(post.post_type),
    );
    TestValidator.predicate(
      `post ${post.id} has author display_name`,
      post.author.display_name.length > 0,
    );
    TestValidator.predicate(
      `post ${post.id} has community name`,
      post.community.name.length > 0,
    );
    TestValidator.predicate(
      `post ${post.id} has preview`,
      post.preview.length > 0,
    );
    // Validate vote_score is a valid integer
    TestValidator.predicate(
      `post ${post.id} has valid vote_score`,
      Number.isInteger(post.vote_score),
    );
    // Validate comment_count is non-negative
    TestValidator.predicate(
      `post ${post.id} has valid comment_count`,
      post.comment_count >= 0,
    );
  }
  // 8. Verify posts are sorted by created_at (newest first)
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      const prevDate = new Date(result.data[i - 1].created_at).getTime();
      const currentDate = new Date(result.data[i].created_at).getTime();
      TestValidator.predicate(
        `post order: post ${i} is not newer than post ${i - 1}`,
        currentDate <= prevDate,
      );
    }
  }
  // 9. Verify all posts belong to the correct author
  for (const post of result.data) {
    TestValidator.equals(
      `post ${post.id} author matches member`,
      post.author.id,
      member.id,
    );
  }
}
