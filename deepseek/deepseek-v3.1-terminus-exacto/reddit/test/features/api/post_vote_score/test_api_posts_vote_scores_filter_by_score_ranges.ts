import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_posts_vote_scores_filter_by_score_ranges(
  connection: api.IConnection,
): Promise<void> {
  // Create main user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community for posting
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create multiple users for voting
  const voterConnections: api.IConnection[] = ArrayUtil.repeat(10, () => ({
    host: connection.host,
  }));
  for (const voterConnection of voterConnections) {
    await authorize_user_join(voterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformUser.IJoin,
    });
  }
  // Create posts with different vote patterns
  const posts: ICommunityPlatformPost[] = [];
  // Post 1: High upvotes (total_score > 10)
  const highScorePost =
    await generate_random_community_platform_user_posts_create(userConnection, {
      body: {
        title: "High Score Post",
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(highScorePost);
  posts.push(highScorePost);
  // Add many upvotes to high score post
  for (let i = 0; i < 8; i++) {
    await generate_random_community_platform_user_posts_votes_create(
      voterConnections[i],
      {
        params: { postId: highScorePost.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  }
  // Post 2: Negative score (total_score < 0)
  const negativeScorePost =
    await generate_random_community_platform_user_posts_create(userConnection, {
      body: {
        title: "Negative Score Post",
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(negativeScorePost);
  posts.push(negativeScorePost);
  // Add downvotes to negative score post
  for (let i = 0; i < 3; i++) {
    await generate_random_community_platform_user_posts_votes_create(
      voterConnections[i],
      {
        params: { postId: negativeScorePost.id },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  }
  // Post 3: Moderate score (within range 5-20)
  const moderateScorePost =
    await generate_random_community_platform_user_posts_create(userConnection, {
      body: {
        title: "Moderate Score Post",
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(moderateScorePost);
  posts.push(moderateScorePost);
  // Add votes to moderate score post
  for (let i = 0; i < 4; i++) {
    await generate_random_community_platform_user_posts_votes_create(
      voterConnections[i],
      {
        params: { postId: moderateScorePost.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  }
  for (let i = 0; i < 1; i++) {
    await generate_random_community_platform_user_posts_votes_create(
      voterConnections[i],
      {
        params: { postId: moderateScorePost.id },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  }
  // Test 1: Filter by total score range (min_total_score=5, max_total_score=20)
  const scoreRangeResults =
    await api.functional.communityPlatform.user.posts.vote_scores.index(
      userConnection,
      {
        body: {
          min_total_score: 5,
          max_total_score: 20,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(scoreRangeResults);
  // Verify only posts with scores in range 5-20 are returned
  for (const result of scoreRangeResults.data) {
    TestValidator.predicate(
      "score in range 5-20",
      result.total_score >= 5 && result.total_score <= 20,
    );
  }
  // Test 2: Filter by minimum upvote count
  const highUpvoteResults =
    await api.functional.communityPlatform.user.posts.vote_scores.index(
      userConnection,
      {
        body: {
          min_upvote_count: 5,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(highUpvoteResults);
  // Verify posts have at least 5 upvotes
  for (const result of highUpvoteResults.data) {
    TestValidator.predicate("at least 5 upvotes", result.upvote_count >= 5);
  }
  // Test 3: Filter by maximum downvote count
  const lowDownvoteResults =
    await api.functional.communityPlatform.user.posts.vote_scores.index(
      userConnection,
      {
        body: {
          max_downvote_count: 2,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(lowDownvoteResults);
  // Verify posts have at most 2 downvotes
  for (const result of lowDownvoteResults.data) {
    TestValidator.predicate("at most 2 downvotes", result.downvote_count <= 2);
  }
  // Test 4: Combined filters
  const combinedResults =
    await api.functional.communityPlatform.user.posts.vote_scores.index(
      userConnection,
      {
        body: {
          min_upvote_count: 3,
          max_downvote_count: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Verify combined filter criteria
  for (const result of combinedResults.data) {
    TestValidator.predicate("at least 3 upvotes", result.upvote_count >= 3);
    TestValidator.predicate("at most 1 downvote", result.downvote_count <= 1);
  }
}
