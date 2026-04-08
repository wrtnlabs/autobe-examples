import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_community_feed_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  console.log("Member joined:", member.username);
  // 2. Create a test community (using community ID from pre-existing environment)
  // For this test, we'll use a generated UUID that represents a test community
  // In real E2E, this would be an existing community or a community created via admin API
  const communityId = typia.random<string & tags.Format<"uuid">>();
  console.log("Testing with community ID:", communityId);
  // 3. Subscribe the member to the community
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: communityId,
        },
      },
    );
  typia.assert(subscription);
  console.log("Member subscribed to community:", subscription.community.name);
  // 4. Create multiple posts in the community with different post types
  const posts: IRedditCommunityPost[] = [];
  // Create text post
  const textPost = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(textPost);
  posts.push(textPost);
  // Create link post
  const linkPost = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Check out this article",
        post_type: "link",
        reddit_community_community_id: communityId,
        link_url: "https://example.com/article",
      },
    },
  );
  typia.assert(linkPost);
  posts.push(linkPost);
  // Create another text post with different timestamp
  const anotherTextPost =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: "Another discussion topic",
          post_type: "text",
          reddit_community_community_id: communityId,
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(anotherTextPost);
  posts.push(anotherTextPost);
  console.log("Created", posts.length, "posts in community");
  // 5. Test sort=new (newest first)
  console.log("\n--- Testing sort=new ---");
  const newSortResult =
    await api.functional.redditCommunity.member.feeds.community.index(
      memberConnection,
      {
        communityId,
        body: {
          sort: "new",
          limit: 100,
          page: 1,
        },
      },
    );
  typia.assert(newSortResult);
  // Verify response structure
  TestValidator.equals(
    "sort=new returns data array",
    newSortResult.data.length > 0,
    true,
  );
  TestValidator.equals(
    "sort=new returns pagination",
    newSortResult.pagination !== undefined,
    true,
  );
  // Verify pagination metadata
  const pagination = newSortResult.pagination;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit matches request", pagination.limit, 100);
  TestValidator.predicate("records is positive", pagination.records > 0);
  TestValidator.predicate("pages is positive", pagination.pages > 0);
  // Verify each post has required fields
  for (const post of newSortResult.data) {
    typia.assert(post);
    // Verify required fields exist
    TestValidator.equals("post has id", post.id !== undefined, true);
    TestValidator.equals("post has title", post.title !== undefined, true);
    TestValidator.equals(
      "post has post_type",
      post.post_type !== undefined,
      true,
    );
    TestValidator.equals(
      "post has vote_score",
      post.vote_score !== undefined,
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      post.comment_count !== undefined,
      true,
    );
    TestValidator.equals(
      "post has created_at",
      post.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "post has updated_at",
      post.updated_at !== undefined,
      true,
    );
    TestValidator.equals(
      "post has deleted_at",
      post.deleted_at !== undefined,
      true,
    );
    TestValidator.equals(
      "post has text_content",
      post.text_content !== undefined,
      true,
    );
    TestValidator.equals(
      "post has link_url",
      post.link_url !== undefined,
      true,
    );
    // Verify author has required fields
    TestValidator.equals("author has id", post.author.id !== undefined, true);
    TestValidator.equals(
      "author has username",
      post.author.username !== undefined,
      true,
    );
    // Verify community has required fields
    TestValidator.equals(
      "community has id",
      post.community.id !== undefined,
      true,
    );
    TestValidator.equals(
      "community has name",
      post.community.name !== undefined,
      true,
    );
    // Verify content is truncated to 200 chars for text_content
    if (post.text_content !== null) {
      TestValidator.predicate(
        "text_content is max 200 chars",
        post.text_content.length <= 200,
      );
    }
    // Verify all posts belong to the correct community
    TestValidator.equals(
      "post belongs to community",
      post.community.id,
      communityId,
    );
    // Verify posts are sorted by created_at descending (newest first)
    TestValidator.predicate(
      "created_at is valid date format",
      /^\d{4}-\d{2}-\d{2}T/.test(post.created_at),
    );
  }
  // Verify sorting: newest posts should appear first
  if (newSortResult.data.length >= 2) {
    const firstCreatedAt = new Date(newSortResult.data[0].created_at).getTime();
    const secondCreatedAt = new Date(
      newSortResult.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "posts sorted by created_at descending (new first)",
      firstCreatedAt >= secondCreatedAt,
    );
  }
  // 6. Test sort=top with timePeriod=this_week
  console.log("\n--- Testing sort=top with timePeriod=this_week ---");
  const topSortResult =
    await api.functional.redditCommunity.member.feeds.community.index(
      memberConnection,
      {
        communityId,
        body: {
          sort: "top",
          timePeriod: "this_week",
          limit: 100,
          page: 1,
        },
      },
    );
  typia.assert(topSortResult);
  TestValidator.equals(
    "sort=top returns data array",
    topSortResult.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "sort=top returns pagination",
    topSortResult.pagination !== undefined,
    true,
  );
  // Verify each post has required fields for top sort
  for (const post of topSortResult.data) {
    typia.assert(post);
    // Verify all required fields exist
    TestValidator.equals("post has id", post.id !== undefined, true);
    TestValidator.equals("post has title", post.title !== undefined, true);
    TestValidator.equals(
      "post has post_type",
      post.post_type !== undefined,
      true,
    );
    TestValidator.equals(
      "post has vote_score",
      post.vote_score !== undefined,
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      post.comment_count !== undefined,
      true,
    );
    TestValidator.equals(
      "post belongs to community",
      post.community.id,
      communityId,
    );
  }
  // Verify posts are sorted by vote_score descending (highest first)
  if (topSortResult.data.length >= 2) {
    const firstVoteScore = topSortResult.data[0].vote_score;
    const secondVoteScore = topSortResult.data[1].vote_score;
    TestValidator.predicate(
      "posts sorted by vote_score descending (top first)",
      firstVoteScore >= secondVoteScore,
    );
  }
  // 7. Test sort=hot
  console.log("\n--- Testing sort=hot ---");
  const hotSortResult =
    await api.functional.redditCommunity.member.feeds.community.index(
      memberConnection,
      {
        communityId,
        body: {
          sort: "hot",
          limit: 100,
          page: 1,
        },
      },
    );
  typia.assert(hotSortResult);
  TestValidator.equals(
    "sort=hot returns data array",
    hotSortResult.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "sort=hot returns pagination",
    hotSortResult.pagination !== undefined,
    true,
  );
  // Verify each post has required fields for hot sort
  for (const post of hotSortResult.data) {
    typia.assert(post);
    // Verify all required fields exist
    TestValidator.equals("post has id", post.id !== undefined, true);
    TestValidator.equals("post has title", post.title !== undefined, true);
    TestValidator.equals(
      "post has post_type",
      post.post_type !== undefined,
      true,
    );
    TestValidator.equals(
      "post has vote_score",
      post.vote_score !== undefined,
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      post.comment_count !== undefined,
      true,
    );
    TestValidator.equals(
      "post belongs to community",
      post.community.id,
      communityId,
    );
  }
  // Verify hot sort produces different ordering than new sort when posts have different engagement
  // (This is a validation that hot algorithm is being applied, not just returning same order)
  const hotIds = hotSortResult.data.map((p) => p.id);
  const newIds = newSortResult.data.map((p) => p.id);
  // At least one post should be in a different position or different order
  // This validates that hot is not just returning new order
  const areDifferentOrders = JSON.stringify(hotIds) !== JSON.stringify(newIds);
  TestValidator.predicate(
    "hot sort differs from new sort (engagement-based)",
    areDifferentOrders || hotSortResult.data.length <= 1,
  );
  console.log("\n✅ All community feed tests passed!");
  console.log("- sort=new: retrieved", newSortResult.data.length, "posts");
  console.log("- sort=top: retrieved", topSortResult.data.length, "posts");
  console.log("- sort=hot: retrieved", hotSortResult.data.length, "posts");
}
