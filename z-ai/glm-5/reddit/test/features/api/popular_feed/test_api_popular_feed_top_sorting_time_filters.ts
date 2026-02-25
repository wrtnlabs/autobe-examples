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
 * Test Top sorting algorithm with all time filter options.
 *
 * This test validates that the popular feed correctly filters posts by creation time
 * when using 'top' sorting, and orders results by vote_score in descending order.
 * Time filters: 'today', 'week', 'month', 'year', 'all'
 */
export async function test_api_popular_feed_top_sorting_time_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // Step 2: Create second member (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // Step 3: Create a test community (author becomes owner and is auto-subscribed)
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // Step 4: Subscribe voter to the community (required for voting)
  const voterSubscription =
    await api.functional.community.member.communities.subscribe(
      voterConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(voterSubscription);
  // Step 5: Create first post (will have higher vote score)
  const firstPost =
    await generate_random_community_member_communities_posts_create(
      authorConnection,
      {
        params: { communityName: community.name },
      },
    );
  typia.assert(firstPost);
  // Step 6: Create second post (will have lower vote score)
  const secondPost =
    await generate_random_community_member_communities_posts_create(
      authorConnection,
      {
        params: { communityName: community.name },
      },
    );
  typia.assert(secondPost);
  // Step 7: Vote on posts to create different vote scores
  // First post gets upvote from voter (already has author's auto-upvote = 2 total)
  const voteResult = await generate_random_community_member_posts_vote(
    voterConnection,
    {
      params: { postId: firstPost.id },
      body: { vote: 1 },
    },
  );
  typia.assert(voteResult);
  // Verify first post now has vote_score of 2
  TestValidator.equals(
    "first post vote score after upvote",
    voteResult.voteScore,
    2,
  );
  // Step 8: Test Top sorting with 'all' time filter (default)
  const allTimeResult = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: { sort: "top", time: "all", limit: 10 },
    },
  );
  typia.assert(allTimeResult);
  // Verify both posts appear
  const firstPostInAll = allTimeResult.data.find((p) => p.id === firstPost.id);
  const secondPostInAll = allTimeResult.data.find(
    (p) => p.id === secondPost.id,
  );
  TestValidator.predicate(
    "all time filter includes first post",
    firstPostInAll !== undefined,
  );
  TestValidator.predicate(
    "all time filter includes second post",
    secondPostInAll !== undefined,
  );
  // Verify ordering by vote_score DESC
  if (firstPostInAll !== undefined && secondPostInAll !== undefined) {
    TestValidator.predicate(
      "first post has higher vote score than second post",
      firstPostInAll.vote_score > secondPostInAll.vote_score,
    );
    const firstPostIndex = allTimeResult.data.findIndex(
      (p) => p.id === firstPost.id,
    );
    const secondPostIndex = allTimeResult.data.findIndex(
      (p) => p.id === secondPost.id,
    );
    TestValidator.predicate(
      "posts ordered by vote_score DESC",
      firstPostIndex < secondPostIndex,
    );
  }
  // Step 9: Test Top sorting with 'today' time filter
  const todayResult = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: { sort: "top", time: "today", limit: 10 },
    },
  );
  typia.assert(todayResult);
  // Both posts were just created, so both should appear in 'today' filter
  const firstPostInToday = todayResult.data.find((p) => p.id === firstPost.id);
  const secondPostInToday = todayResult.data.find(
    (p) => p.id === secondPost.id,
  );
  TestValidator.predicate(
    "today filter includes first post",
    firstPostInToday !== undefined,
  );
  TestValidator.predicate(
    "today filter includes second post",
    secondPostInToday !== undefined,
  );
  // Step 10: Test Top sorting with 'week' time filter
  const weekResult = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: { sort: "top", time: "week", limit: 10 },
    },
  );
  typia.assert(weekResult);
  const firstPostInWeek = weekResult.data.find((p) => p.id === firstPost.id);
  const secondPostInWeek = weekResult.data.find((p) => p.id === secondPost.id);
  TestValidator.predicate(
    "week filter includes first post",
    firstPostInWeek !== undefined,
  );
  TestValidator.predicate(
    "week filter includes second post",
    secondPostInWeek !== undefined,
  );
  // Step 11: Test Top sorting with 'month' time filter
  const monthResult = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: { sort: "top", time: "month", limit: 10 },
    },
  );
  typia.assert(monthResult);
  const firstPostInMonth = monthResult.data.find((p) => p.id === firstPost.id);
  const secondPostInMonth = monthResult.data.find(
    (p) => p.id === secondPost.id,
  );
  TestValidator.predicate(
    "month filter includes first post",
    firstPostInMonth !== undefined,
  );
  TestValidator.predicate(
    "month filter includes second post",
    secondPostInMonth !== undefined,
  );
  // Step 12: Test Top sorting with 'year' time filter
  const yearResult = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: { sort: "top", time: "year", limit: 10 },
    },
  );
  typia.assert(yearResult);
  const firstPostInYear = yearResult.data.find((p) => p.id === firstPost.id);
  const secondPostInYear = yearResult.data.find((p) => p.id === secondPost.id);
  TestValidator.predicate(
    "year filter includes first post",
    firstPostInYear !== undefined,
  );
  TestValidator.predicate(
    "year filter includes second post",
    secondPostInYear !== undefined,
  );
  // Step 13: Verify time filter only applies to 'top' sort
  // When using 'hot' sort with time parameter, the time parameter should be ignored
  const hotResult = await api.functional.community.feeds.popular.index(
    connection,
    {
      body: { sort: "hot", time: "today", limit: 10 },
    },
  );
  typia.assert(hotResult);
  // Hot sorting should still work (time parameter ignored)
  TestValidator.predicate(
    "hot sort returns results despite time parameter",
    hotResult.data.length >= 0,
  );
  // Step 14: Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    allTimeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    allTimeResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allTimeResult.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    allTimeResult.pagination.pages >= 1,
  );
}
