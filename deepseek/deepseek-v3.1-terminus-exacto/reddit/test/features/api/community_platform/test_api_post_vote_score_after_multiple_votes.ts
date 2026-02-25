import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_score_after_multiple_votes(
  connection: api.IConnection,
): Promise<void> {
  // Create first user and post
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user1);
  const post = await generate_random_community_platform_user_posts_create(
    user1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "general",
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create second user and cast upvote
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user2);
  const vote2 =
    await generate_random_community_platform_user_posts_votes_create(
      user2Connection,
      {
        params: { postId: post.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote2);
  // Create third user and cast downvote
  const user3Connection: api.IConnection = { host: connection.host };
  const user3 = await authorize_user_join(user3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user3);
  const vote3 =
    await generate_random_community_platform_user_posts_votes_create(
      user3Connection,
      {
        params: { postId: post.id },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote3);
  // Create fourth user, initially upvote then change to downvote
  const user4Connection: api.IConnection = { host: connection.host };
  const user4 = await authorize_user_join(user4Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user4);
  const vote4Initial =
    await generate_random_community_platform_user_posts_votes_create(
      user4Connection,
      {
        params: { postId: post.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote4Initial);
  // Change vote from upvote to downvote
  const vote4Updated =
    await api.functional.communityPlatform.user.posts.votes.update(
      user4Connection,
      {
        postId: post.id,
        voteId: vote4Initial.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(vote4Updated);
  // Retrieve vote score
  const voteScore =
    await api.functional.communityPlatform.user.posts.vote_score.at(
      user1Connection,
      {
        postId: post.id,
      },
    );
  typia.assert(voteScore);
  // Validate vote counts
  TestValidator.equals("upvote_count should be 1", voteScore.upvote_count, 1);
  TestValidator.equals(
    "downvote_count should be 2",
    voteScore.downvote_count,
    2,
  );
  TestValidator.equals("total_score should be -1", voteScore.total_score, -1);
  // Verify last_updated_at is recent
  TestValidator.predicate(
    "last_updated_at should be set",
    voteScore.last_updated_at !== null,
  );
}
