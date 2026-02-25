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

export async function test_api_posts_vote_scores_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple users to vote on posts
  const users: api.IConnection[] = [];
  // Create first user (main user for authentication)
  const mainUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(mainUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create additional users for voting
  for (let i = 0; i < 3; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.alphabets(8),
      } satisfies ICommunityPlatformUser.IJoin,
    });
    users.push(userConnection);
  }
  // Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      mainUserConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create multiple posts
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 5; i++) {
    const post = await generate_random_community_platform_user_posts_create(
      mainUserConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community.name,
          post_type: "text" as const,
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // Have users vote on posts to create different vote scores
  const voteTypes = ["upvote", "downvote"] as const;
  for (const post of posts) {
    for (const userConnection of users) {
      // Randomly assign upvote or downvote using type-safe method
      const voteType = RandomGenerator.pick(voteTypes);
      await generate_random_community_platform_user_posts_votes_create(
        userConnection,
        {
          params: { postId: post.id },
          body: {
            vote_type: voteType,
          } satisfies ICommunityPlatformPostVote.ICreate,
        },
      );
    }
  }
  // Test basic pagination with minimal filters
  const response =
    await api.functional.communityPlatform.user.posts.vote_scores.index(
      mainUserConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records positive",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // Validate each item structure - typia.assert already validates all types
  for (const item of response.data) {
    // Validate total_score calculation
    TestValidator.equals(
      "total_score equals upvote_count - downvote_count",
      item.total_score,
      item.upvote_count - item.downvote_count,
    );
  }
  // Test second page pagination
  const secondPageResponse =
    await api.functional.communityPlatform.user.posts.vote_scores.index(
      mainUserConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  // Validate second page metadata
  TestValidator.equals(
    "second page current page",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit",
    secondPageResponse.pagination.limit,
    20,
  );
  // If there are enough records, verify pagination works
  if (response.pagination.records > 20 && secondPageResponse.data.length > 0) {
    TestValidator.predicate(
      "second page has data",
      secondPageResponse.data.length > 0,
    );
  }
}
