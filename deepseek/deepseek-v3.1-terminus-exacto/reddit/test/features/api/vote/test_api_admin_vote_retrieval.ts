import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

/**
 * Test that an admin can successfully retrieve detailed vote information for a vote cast on a post.
 * Creates a regular user who creates a post and votes on it, then authenticates as admin
 * and retrieves the vote record. Verifies the response contains complete vote details
 * including vote type, timestamps, and relationships to both the voting user and the post.
 */
export async function test_api_admin_vote_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a regular user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 2. Create a community for the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10) + Date.now().toString(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
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
  // 4. Create a vote on the post by the user
  const vote = await generate_random_community_platform_user_posts_votes_create(
    userConnection,
    {
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformPostVote.ICreate,
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(vote);
  // 5. Create and authenticate an admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 6. Retrieve the vote details using admin privileges
  const retrievedVote =
    await api.functional.communityPlatform.admin.posts.votes.at(
      adminConnection,
      {
        postId: post.id,
        voteId: vote.id,
      },
    );
  typia.assert(retrievedVote);
  // 7. Validate vote information matches the created vote
  TestValidator.equals("vote ID matches", retrievedVote.id, vote.id);
  TestValidator.equals("vote type matches", retrievedVote.vote_type, "upvote");
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedVote.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedVote.updated_at !== undefined,
  );
  // 8. Verify relationships to user and post are correct
  TestValidator.equals("user ID matches", retrievedVote.user.id, vote.user.id);
  TestValidator.equals("post ID matches", retrievedVote.post.id, post.id);
  TestValidator.equals(
    "post title matches",
    retrievedVote.post.title,
    post.title,
  );
}
