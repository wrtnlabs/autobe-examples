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

export async function test_api_post_vote_change_workflow_negative_to_remove(
  connection: api.IConnection,
): Promise<void> {
  // Create author user
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(author);
  // Create voter user
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_user_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(voter);
  // Author creates community
  const community =
    await generate_random_community_platform_user_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Author subscribes to own community
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
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Voter subscribes to community
  const voterSubscription =
    await generate_random_community_platform_user_subscriptions_create(
      voterConnection,
      {
        body: {
          community_platform_community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(voterSubscription);
  // Voter casts downvote
  const downvote =
    await generate_random_community_platform_user_posts_votes_create(
      voterConnection,
      {
        body: {
          vote_type: "downvote" as const,
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(downvote);
  // Remove the downvote
  await api.functional.communityPlatform.user.posts.votes.erase(
    voterConnection,
    {
      postId: post.id,
      voteId: downvote.id,
    },
  );
  // Test duplicate vote removal (should fail)
  await TestValidator.error("duplicate vote removal", async () => {
    await api.functional.communityPlatform.user.posts.votes.erase(
      voterConnection,
      {
        postId: post.id,
        voteId: downvote.id,
      },
    );
  });
  // Test invalid voteId (should fail)
  await TestValidator.error("invalid voteId", async () => {
    await api.functional.communityPlatform.user.posts.votes.erase(
      voterConnection,
      {
        postId: post.id,
        voteId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test unauthorized vote deletion (different user tries to delete)
  await TestValidator.error("unauthorized vote deletion", async () => {
    await api.functional.communityPlatform.user.posts.votes.erase(
      authorConnection,
      {
        postId: post.id,
        voteId: downvote.id,
      },
    );
  });
}
