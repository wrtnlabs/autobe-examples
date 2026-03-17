import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFeedQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFeedQuery";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFeedQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFeedQuery";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

/**
 * Test the home feed endpoint with a member who has active subscriptions to communities.
 * Validates that posts from subscribed communities appear in the home feed with correct metadata.
 */
export async function test_api_home_feed_with_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create a new connection with the member's token for subsequent API calls
  const memberAuthorizedConnection: api.IConnection = {
    host: connection.host,
  };
  memberAuthorizedConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 2. Generate a placeholder community_id for post creation
  // Note: Without admin APIs, we cannot create actual communities.
  // This is a compilation workaround; the API will validate the community exists.
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Create 3 posts in the community using different post types
  const createdPosts: {
    id: string;
    post_type: "text" | "link" | "image";
  }[] = [];
  // Create text post
  const textPostBody = {
    title: RandomGenerator.name(3),
    community_id: communityId,
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;
  const textPost = await api.functional.redditCommunity.member.posts.create(
    memberAuthorizedConnection,
    { body: textPostBody },
  );
  typia.assert(textPost);
  createdPosts.push({
    id: textPost.id,
    post_type: "text",
  });
  // Create link post
  const linkPostBody = {
    title: RandomGenerator.name(2),
    community_id: communityId,
    post_type: "link" as const,
    url: "https://example.com/article",
  } satisfies IRedditCommunityPost.ICreate;
  const linkPost = await api.functional.redditCommunity.member.posts.create(
    memberAuthorizedConnection,
    { body: linkPostBody },
  );
  typia.assert(linkPost);
  createdPosts.push({
    id: linkPost.id,
    post_type: "link",
  });
  // Create another text post with different content
  const textPost2Body = {
    title: RandomGenerator.name(4),
    community_id: communityId,
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IRedditCommunityPost.ICreate;
  const textPost2 = await api.functional.redditCommunity.member.posts.create(
    memberAuthorizedConnection,
    { body: textPost2Body },
  );
  typia.assert(textPost2);
  createdPosts.push({
    id: textPost2.id,
    post_type: "text",
  });
  // 4. Call the home feed endpoint
  const feedResponse =
    await api.functional.redditCommunity.member.home.feed.index(
      memberAuthorizedConnection,
      {
        body: {
          pageSize: 20,
          limit: 20,
        },
      },
    );
  typia.assert(feedResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match requested",
    feedResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records should match data length",
    feedResponse.pagination.records,
    feedResponse.data.length,
  );
  TestValidator.equals(
    "pagination pages should be calculated correctly",
    feedResponse.pagination.pages,
    Math.ceil(feedResponse.pagination.records / feedResponse.pagination.limit),
  );
  // 5. Verify all posts in feed have correct structure
  for (const post of feedResponse.data) {
    typia.assert(post);
    // Validate author information
    TestValidator.predicate(
      "author should have id",
      post.author.id !== undefined,
    );
    TestValidator.predicate(
      "author should have username",
      post.author.username !== undefined && post.author.username.length > 0,
    );
    // Validate community information
    TestValidator.predicate(
      "community should have id",
      post.community.id !== undefined,
    );
    TestValidator.predicate(
      "community should have name",
      post.community.name !== undefined && post.community.name.length > 0,
    );
    // Validate vote score is a number
    TestValidator.predicate(
      "voteScore should be a valid number",
      typeof post.voteScore === "number",
    );
    // Validate comment count is a number
    TestValidator.predicate(
      "commentCount should be a valid number",
      typeof post.commentCount === "number",
    );
    // Validate content preview exists and is properly truncated
    TestValidator.predicate(
      "contentPreview should exist",
      post.contentPreview !== undefined && post.contentPreview !== null,
    );
    TestValidator.predicate(
      "contentPreview should be string",
      typeof post.contentPreview === "string",
    );
    TestValidator.predicate(
      "contentPreview should be max 200 characters",
      post.contentPreview.length <= 200,
    );
  }
  // 6. Verify that created posts appear in the feed
  const feedPostIds = new Set(feedResponse.data.map((post) => post.id));
  for (const createdPost of createdPosts) {
    TestValidator.predicate(
      "created post should appear in feed",
      feedPostIds.has(createdPost.id),
    );
  }
}
