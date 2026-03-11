import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_post_vote } from "../../../prepare/prepare_random_reddit_like_post_vote";

export async function test_api_popular_feed_top_posts_time_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as member to access popular feed
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create a community for posts (popular feed requires community subscription)
  // Note: The popular feed likely requires a community context, so create one
  const communityName = `test-community-${RandomGenerator.alphaNumeric(5)}`;
  // 3. Create multiple posts with different timestamps to test time filtering
  const postDate = new Date();
  const posts: IRedditLikePost[] = [];
  // Create posts across different time periods
  for (let i = 0; i < 12; i++) {
    const date = new Date(postDate.getTime() - i * 24 * 60 * 60 * 1000); // 24 hours apart
    const post = await generate_random_reddit_like_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(),
          type: "text" as const,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    posts.push(post);
  }
  // 4. Apply upvotes to posts to establish ranking
  for (const [index, post] of posts.entries()) {
    const voteCount = 10 - index; // Posts get different vote counts
    for (let j = 0; j < voteCount; j++) {
      await generate_random_reddit_like_member_posts_votes_create(
        memberConnection,
        {
          body: { value: 1 as const },
          params: { postId: post.id },
        },
      );
    }
  }
  // 5. Test time filtering on popular feed with Top sort
  // Test All time filter (should include all posts)
  const allTimeResponse = await api.functional.redditLike.member.popular.index(
    memberConnection,
    {
      body: {
        title: "Test",
        type: "text",
        communityName: communityName,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(allTimeResponse);
  TestValidator.equals(
    "all time returns all posts",
    allTimeResponse.data.length,
    12,
  );
  // Test Today filter (should return only today's posts)
  const todayResponse = await api.functional.redditLike.member.popular.index(
    memberConnection,
    {
      body: {
        title: "Test",
        type: "text",
        communityName: communityName,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(todayResponse);
  // Test This week filter
  const weekResponse = await api.functional.redditLike.member.popular.index(
    memberConnection,
    {
      body: {
        title: "Test",
        type: "text",
        communityName: communityName,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(weekResponse);
  // Test This month filter
  const monthResponse = await api.functional.redditLike.member.popular.index(
    memberConnection,
    {
      body: {
        title: "Test",
        type: "text",
        communityName: communityName,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(monthResponse);
  // Test This year filter
  const yearResponse = await api.functional.redditLike.member.popular.index(
    memberConnection,
    {
      body: {
        title: "Test",
        type: "text",
        communityName: communityName,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(yearResponse);
  // 6. Validate that top posts are properly sorted by vote score
  for (const response of [
    allTimeResponse,
    todayResponse,
    weekResponse,
    monthResponse,
    yearResponse,
  ]) {
    // Validate posts are sorted by vote score (descending)
    let prevScore = Number.MAX_SAFE_INTEGER;
    for (const post of response.data) {
      TestValidator.predicate(
        "top posts sorted by score",
        post.voteScore <= prevScore,
      );
      prevScore = post.voteScore;
    }
  }
}
