import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_score_aggregated_stats_for_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: "Test Admin",
      permissions_level: "full",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create multiple users to vote
  const voterConnections: api.IConnection[] = [];
  const votes: Array<{
    connection: api.IConnection;
    voteType: "upvote" | "downvote";
  }> = [];
  // Create 5 voters with mixed vote types
  for (let i = 0; i < 5; i++) {
    const voterConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(voterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "voter1234",
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformUser.IJoin,
    });
    voterConnections.push(voterConnection);
    // Alternate between upvote and downvote
    const voteType = i % 2 === 0 ? "upvote" : "downvote";
    votes.push({ connection: voterConnection, voteType });
  }
  // Cast votes
  let expectedUpvotes = 0;
  let expectedDownvotes = 0;
  for (const vote of votes) {
    await generate_random_community_platform_user_posts_votes_create(
      vote.connection,
      {
        params: { postId: post.id },
        body: {
          vote_type: vote.voteType,
        } satisfies DeepPartial<ICommunityPlatformPostVote.ICreate>,
      },
    );
    if (vote.voteType === "upvote") {
      expectedUpvotes++;
    } else {
      expectedDownvotes++;
    }
  }
  const expectedTotalScore = expectedUpvotes - expectedDownvotes;
  // Admin retrieves vote score statistics
  const voteScore =
    await api.functional.communityPlatform.admin.posts.vote_score.at(
      adminConnection,
      { postId: post.id },
    );
  typia.assert(voteScore);
  // Validate vote score statistics
  TestValidator.equals(
    "upvote count matches",
    voteScore.upvote_count,
    expectedUpvotes,
  );
  TestValidator.equals(
    "downvote count matches",
    voteScore.downvote_count,
    expectedDownvotes,
  );
  TestValidator.equals(
    "total score matches",
    voteScore.total_score,
    expectedTotalScore,
  );
  // Validate timestamps are present
  TestValidator.predicate("created_at exists", voteScore.created_at !== null);
  TestValidator.predicate("updated_at exists", voteScore.updated_at !== null);
  TestValidator.predicate(
    "last_updated_at exists",
    voteScore.last_updated_at !== null,
  );
  // Validate timestamp logical order
  const createdAt = new Date(voteScore.created_at);
  const updatedAt = new Date(voteScore.updated_at);
  const lastUpdatedAt = voteScore.last_updated_at
    ? new Date(voteScore.last_updated_at)
    : null;
  TestValidator.predicate(
    "created_at before updated_at",
    createdAt <= updatedAt,
  );
  if (lastUpdatedAt) {
    TestValidator.predicate(
      "last_updated_at after created_at",
      lastUpdatedAt >= createdAt,
    );
  }
}
