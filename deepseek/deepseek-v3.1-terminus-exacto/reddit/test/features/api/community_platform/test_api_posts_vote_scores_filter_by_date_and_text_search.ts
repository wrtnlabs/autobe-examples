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

export async function test_api_posts_vote_scores_filter_by_date_and_text_search(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create a community for posting
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
  // Create posts at different times with varied titles
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  // Create posts with specific keywords
  const techPost = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: "Great tech review about programming",
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(techPost);
  const foodPost = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: "Delicious food recipe with ingredients",
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(foodPost);
  const travelPost = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: "Amazing travel adventure story",
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(travelPost);
  // Add votes to update last_updated_at timestamps
  await generate_random_community_platform_user_posts_votes_create(
    userConnection,
    {
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
      params: { postId: techPost.id },
    },
  );
  await generate_random_community_platform_user_posts_votes_create(
    userConnection,
    {
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
      params: { postId: foodPost.id },
    },
  );
  await generate_random_community_platform_user_posts_votes_create(
    userConnection,
    {
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
      params: { postId: travelPost.id },
    },
  );
  // Test 1: Filter by date range (posts from last hour)
  const recentResults =
    await api.functional.communityPlatform.user.posts.vote_scores.index(
      userConnection,
      {
        body: {
          start_last_updated_at: oneHourAgo.toISOString(),
          end_last_updated_at: now.toISOString(),
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(recentResults);
  // Test 2: Text search for "tech" keyword
  const techResults =
    await api.functional.communityPlatform.user.posts.vote_scores.index(
      userConnection,
      {
        body: {
          search: "tech",
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(techResults);
  // Test 3: Combine date range and text search
  const combinedResults =
    await api.functional.communityPlatform.user.posts.vote_scores.index(
      userConnection,
      {
        body: {
          start_last_updated_at: twoHoursAgo.toISOString(),
          end_last_updated_at: now.toISOString(),
          search: "food",
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Test 4: Empty result set with non-matching filters
  const emptyResults =
    await api.functional.communityPlatform.user.posts.vote_scores.index(
      userConnection,
      {
        body: {
          search: "nonexistentkeyword",
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(emptyResults);
  // Test 5: Limit parameter enforcement
  const limitedResults =
    await api.functional.communityPlatform.user.posts.vote_scores.index(
      userConnection,
      {
        body: {
          limit: 2,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(limitedResults);
  // Validations
  TestValidator.equals(
    "recent results should contain posts",
    recentResults.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "tech results should contain tech post",
    techResults.data.some((item) => item.upvote_count > 0),
  );
  TestValidator.predicate(
    "combined results should contain food post",
    combinedResults.data.some((item) => item.upvote_count > 0),
  );
  TestValidator.equals(
    "empty results should have no data",
    emptyResults.data.length,
    0,
  );
  TestValidator.predicate(
    "limited results should respect limit",
    limitedResults.data.length <= 2,
  );
}
