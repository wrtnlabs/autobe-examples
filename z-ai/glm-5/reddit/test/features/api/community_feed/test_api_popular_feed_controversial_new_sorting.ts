import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_vote } from "../../../generate/generate_random_community_member_posts_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_post_vote } from "../../../prepare/prepare_random_community_post_vote";

/**
 * Test Controversial and New sorting algorithms for popular feed.
 *
 * Setup: Create members, community, posts with different vote patterns
 * Test Controversial: Posts with many votes but score near 0 rank highest
 * Test New: Posts ordered by creation time DESC
 * Test Hot: Posts ordered by hot_score DESC
 * Test Top: Posts ordered by vote_score DESC
 * Verify: Different sorting produces different orderings
 * Verify: Anonymous access works for public endpoint
 * Verify: Pagination respects limit bounds (min 10, max 100)
 */
export async function test_api_popular_feed_controversial_new_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register first member (post creator and upvoter)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // Step 2: Register second member (will downvote controversial posts)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // Step 3: Create test community (member1 becomes owner)
  const community = await generate_random_community_member_communities_create(
    member1Connection,
    {},
  );
  typia.assert(community);
  // Step 4: Subscribe both members to the community
  const subscription1 =
    await api.functional.community.member.communities.subscribe(
      member1Connection,
      { communityName: community.name },
    );
  typia.assert(subscription1);
  const subscription2 =
    await api.functional.community.member.communities.subscribe(
      member2Connection,
      { communityName: community.name },
    );
  typia.assert(subscription2);
  // Step 5: Create controversial post (will receive mixed votes)
  const controversialPost =
    await generate_random_community_member_communities_posts_create(
      member1Connection,
      {
        params: { communityName: community.name },
        body: {
          title: "Controversial Topic for Debate",
          post_type: "TEXT",
          text_content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        },
      },
    );
  typia.assert(controversialPost);
  // Brief pause to ensure different creation timestamps
  await new Promise((resolve) => setTimeout(resolve, 50));
  // Step 6: Create regular post (will receive only upvotes - higher net score)
  const regularPost =
    await generate_random_community_member_communities_posts_create(
      member1Connection,
      {
        params: { communityName: community.name },
        body: {
          title: "Popular Post Everyone Loves",
          post_type: "TEXT",
          text_content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        },
      },
    );
  typia.assert(regularPost);
  // Step 7: Vote manipulation to create controversy
  // Member2 downvotes the controversial post
  const downvoteResult = await generate_random_community_member_posts_vote(
    member2Connection,
    {
      params: { postId: controversialPost.id },
      body: { vote: -1 },
    },
  );
  typia.assert(downvoteResult);
  // Member2 upvotes the regular post
  const upvoteResult = await generate_random_community_member_posts_vote(
    member2Connection,
    {
      params: { postId: regularPost.id },
      body: { vote: 1 },
    },
  );
  typia.assert(upvoteResult);
  // After voting:
  // Controversial post: 1 upvote (author) + 1 downvote = vote_score 0
  // Regular post: 1 upvote (author) + 1 upvote = vote_score 2
  // Step 8: Test Controversial sorting
  const controversialFeed = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: {
        sort: "controversial",
        limit: 10,
      },
    },
  );
  typia.assert(controversialFeed);
  // Verify both posts are in the feed
  const controversialFeedIds = controversialFeed.data.map((p) => p.id);
  TestValidator.predicate(
    "controversial feed contains both posts",
    controversialFeedIds.includes(controversialPost.id) &&
      controversialFeedIds.includes(regularPost.id),
  );
  // In controversial sort, post with score near 0 ranks higher
  const controversialPosition = controversialFeed.data.findIndex(
    (p) => p.id === controversialPost.id,
  );
  const regularPositionInControversial = controversialFeed.data.findIndex(
    (p) => p.id === regularPost.id,
  );
  TestValidator.predicate(
    "controversial post ranks higher in controversial sort",
    controversialPosition >= 0 &&
      regularPositionInControversial >= 0 &&
      controversialPosition < regularPositionInControversial,
  );
  // Step 9: Test New sorting
  const newFeed = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: {
        sort: "new",
        limit: 10,
      },
    },
  );
  typia.assert(newFeed);
  // In new sort, regular post (created later) should appear first
  const controversialNewPosition = newFeed.data.findIndex(
    (p) => p.id === controversialPost.id,
  );
  const regularNewPosition = newFeed.data.findIndex(
    (p) => p.id === regularPost.id,
  );
  TestValidator.predicate(
    "regular post appears first in new sort (created later)",
    regularNewPosition >= 0 &&
      controversialNewPosition >= 0 &&
      regularNewPosition < controversialNewPosition,
  );
  // Step 10: Test Hot sorting (default)
  const hotFeed = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: {
        sort: "hot",
        limit: 10,
      },
    },
  );
  typia.assert(hotFeed);
  // Verify posts are in hot feed
  const hotFeedIds = hotFeed.data.map((p) => p.id);
  TestValidator.predicate(
    "hot feed contains both posts",
    hotFeedIds.includes(controversialPost.id) &&
      hotFeedIds.includes(regularPost.id),
  );
  // Step 11: Test Top sorting
  const topFeed = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: {
        sort: "top",
        time: "all",
        limit: 10,
      },
    },
  );
  typia.assert(topFeed);
  // In top sort, regular post (score 2) should rank higher than controversial (score 0)
  const controversialTopPosition = topFeed.data.findIndex(
    (p) => p.id === controversialPost.id,
  );
  const regularTopPosition = topFeed.data.findIndex(
    (p) => p.id === regularPost.id,
  );
  TestValidator.predicate(
    "regular post ranks higher in top sort",
    regularTopPosition >= 0 &&
      controversialTopPosition >= 0 &&
      regularTopPosition < controversialTopPosition,
  );
  // Step 12: Verify different sorting produces different orderings
  TestValidator.notEquals(
    "controversial and new sorting produce different orderings",
    controversialFeed.data.map((p) => p.id).join(","),
    newFeed.data.map((p) => p.id).join(","),
  );
  TestValidator.notEquals(
    "new and top sorting produce different orderings",
    newFeed.data.map((p) => p.id).join(","),
    topFeed.data.map((p) => p.id).join(","),
  );
  // Step 13: Test limit parameter bounds (server adjusts to min 10)
  const limitedFeed = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: {
        sort: "new",
        limit: 5, // Server should adjust to minimum 10
      },
    },
  );
  typia.assert(limitedFeed);
  // Verify limit is adjusted to minimum of 10
  TestValidator.predicate(
    "limit adjusted to minimum 10",
    limitedFeed.pagination.limit >= 10,
  );
  // Step 14: Test pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    limitedFeed.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    limitedFeed.pagination.limit >= 10 && limitedFeed.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    limitedFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    limitedFeed.pagination.pages >= 0,
  );
  // Step 15: Verify anonymous access works (endpoint is public)
  const anonymousConnection: api.IConnection = { host: connection.host };
  const anonymousFeed = await api.functional.community.feeds.popular.index(
    anonymousConnection,
    {
      body: {
        sort: "hot",
        limit: 10,
      },
    },
  );
  typia.assert(anonymousFeed);
  TestValidator.predicate(
    "anonymous access returns valid feed",
    anonymousFeed.data.length >= 0,
  );
}
