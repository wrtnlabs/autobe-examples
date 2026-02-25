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

export async function test_api_post_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate User A (voter)
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuth = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAAuth);
  // Step 2: Create and authenticate User B (post author)
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuth = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userBAuth);
  // Step 3: User B creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userBConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 4: User B creates a post
  const post = await generate_random_community_platform_user_posts_create(
    userBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({
          sentences: 3,
        }) satisfies string & tags.MinLength<10>,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: User A initially votes 'upvote'
  const firstVote =
    await generate_random_community_platform_user_posts_votes_create(
      userAConnection,
      {
        body: {
          vote_type: "upvote" as const,
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(firstVote);
  // Verify first vote properties
  TestValidator.equals(
    "first vote type should be upvote",
    firstVote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "first vote user should be User A",
    firstVote.user.id,
    userAAuth.id,
  );
  TestValidator.equals(
    "first vote post should match",
    firstVote.post.id,
    post.id,
  );
  // Step 6: User A changes vote to 'downvote'
  const secondVote =
    await generate_random_community_platform_user_posts_votes_create(
      userAConnection,
      {
        body: {
          vote_type: "downvote" as const,
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(secondVote);
  // Verify second vote properties
  TestValidator.equals(
    "second vote type should be downvote",
    secondVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "second vote user should be User A",
    secondVote.user.id,
    userAAuth.id,
  );
  TestValidator.equals(
    "second vote post should match",
    secondVote.post.id,
    post.id,
  );
  // Verify vote record update (same vote ID, different vote type)
  TestValidator.equals(
    "vote ID should remain the same",
    secondVote.id,
    firstVote.id,
  );
  TestValidator.notEquals(
    "updated_at should change",
    secondVote.updated_at,
    firstVote.updated_at,
  );
  // Note: Karma validation is removed since there's no proper API endpoint to retrieve updated user karma
  // The post vote count validation is also removed since the post retrieval endpoint is not available
  // The test focuses on the core voting behavior change functionality
}
