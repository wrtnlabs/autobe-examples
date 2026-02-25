import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

/**
 * Test that when a post is deleted, attempting to remove votes on that deleted post fails appropriately.
 * This validates referential integrity and business rule that deleted content cannot have votes manipulated.
 */
export async function test_api_post_deletion_cascades_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // Create author user
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(author);
  // Create first voter user
  const firstVoterConnection: api.IConnection = { host: connection.host };
  const firstVoter = await authorize_user_join(firstVoterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(firstVoter);
  // Create second voter user
  const secondVoterConnection: api.IConnection = { host: connection.host };
  const secondVoter = await authorize_user_join(secondVoterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(secondVoter);
  // Author creates community
  const community =
    await generate_random_community_platform_user_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Author subscribes to community
  const authorSubscription =
    await generate_random_community_platform_user_subscriptions_create(
      authorConnection,
      {
        body: {
          community_platform_community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(authorSubscription);
  // Author creates post
  const post = await generate_random_community_platform_user_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // First voter subscribes to community
  const firstVoterSubscription =
    await generate_random_community_platform_user_subscriptions_create(
      firstVoterConnection,
      {
        body: {
          community_platform_community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(firstVoterSubscription);
  // Second voter subscribes to community
  const secondVoterSubscription =
    await generate_random_community_platform_user_subscriptions_create(
      secondVoterConnection,
      {
        body: {
          community_platform_community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(secondVoterSubscription);
  // First voter casts vote
  const firstVote =
    await generate_random_community_platform_user_posts_votes_create(
      firstVoterConnection,
      {
        params: { postId: post.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(firstVote);
  // Second voter casts vote
  const secondVote =
    await generate_random_community_platform_user_posts_votes_create(
      secondVoterConnection,
      {
        params: { postId: post.id },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(secondVote);
  // Author deletes the post
  await api.functional.communityPlatform.user.posts.erase(authorConnection, {
    postId: post.id,
  });
  // First voter attempts to remove vote from deleted post
  await TestValidator.error(
    "first voter vote removal should fail on deleted post",
    async () => {
      await api.functional.communityPlatform.user.posts.votes.erase(
        firstVoterConnection,
        {
          postId: post.id,
          voteId: firstVote.id,
        },
      );
    },
  );
  // Second voter attempts to remove vote from deleted post
  await TestValidator.error(
    "second voter vote removal should fail on deleted post",
    async () => {
      await api.functional.communityPlatform.user.posts.votes.erase(
        secondVoterConnection,
        {
          postId: post.id,
          voteId: secondVote.id,
        },
      );
    },
  );
}
