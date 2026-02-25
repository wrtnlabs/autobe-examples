import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_update_downvote_to_upvote(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
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
  // Store initial post vote count and author karma
  const initialVoteCount = post.votes_count;
  const initialAuthorKarma = post.author.karma;
  // Create initial downvote
  const downvote =
    await generate_random_community_platform_user_posts_votes_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          vote_type: "downvote" as const,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(downvote);
  // Update vote from downvote to upvote
  const updatedVote =
    await api.functional.communityPlatform.user.posts.votes.update(
      userConnection,
      {
        postId: post.id,
        voteId: downvote.id,
        body: {
          vote_type: "upvote" as const,
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // Validate vote type update
  TestValidator.equals(
    "vote type should be updated to upvote",
    updatedVote.vote_type,
    "upvote",
  );
  TestValidator.notEquals(
    "updated_at should be different from created_at",
    updatedVote.updated_at,
    updatedVote.created_at,
  );
  // Validate vote ownership and relationships
  TestValidator.equals(
    "vote should belong to the same user",
    updatedVote.user.id,
    user.id,
  );
  TestValidator.equals(
    "vote should be for the same post",
    updatedVote.post.id,
    post.id,
  );
  // Test unauthorized vote modification attempt with a different user
  const unauthorizedUserConnection: api.IConnection = { host: connection.host };
  const unauthorizedUser = await authorize_user_join(
    unauthorizedUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(unauthorizedUser);
  await TestValidator.error(
    "unauthorized user should not be able to update vote",
    async () => {
      await api.functional.communityPlatform.user.posts.votes.update(
        unauthorizedUserConnection,
        {
          postId: post.id,
          voteId: downvote.id,
          body: {
            vote_type: "upvote" as const,
          } satisfies ICommunityPlatformPostVote.IUpdate,
        },
      );
    },
  );
}
