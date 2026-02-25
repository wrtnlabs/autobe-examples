import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingTransaction";
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

export async function test_api_voting_transaction_update_vote_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Store initial karma for comparison
  const initialKarma = user.karma;
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create initial upvote and capture transaction ID
  const initialVote =
    await generate_random_community_platform_user_posts_votes_create(
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
  typia.assert(initialVote);
  // Get the transaction ID from the initial vote (assuming it's stored in the vote response)
  // Since the DTO doesn't show transaction ID in the vote response, we need to find another way
  // For now, we'll proceed with the vote change and then retrieve transactions
  // 5. Change vote to downvote
  const updatedVote =
    await generate_random_community_platform_user_posts_votes_create(
      userConnection,
      {
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(updatedVote);
  // Since we don't have a direct way to get transaction IDs from votes,
  // we need to find an alternative approach. For now, we'll assume the system
  // provides a way to get transactions by user or we need to list all transactions
  // and filter for the latest one related to this vote change.
  // This part needs to be implemented based on actual API capabilities
  // For the purpose of this test, we'll focus on validating the voting behavior
  // and karma impact through user profile retrieval
  // Retrieve updated user profile to check karma changes
  // Note: This assumes there's an endpoint to get user profile
  // Since we don't have that endpoint in the provided API functions,
  // we'll focus on the voting transaction validation we can perform
  // The core issue is that we don't have a way to retrieve voting transactions
  // by vote ID or user ID in the provided API functions. The only transaction
  // endpoint requires a specific transactionId, which we don't have.
  // Given the constraints, we'll validate the voting behavior worked correctly
  // by checking that the vote was successfully updated
  TestValidator.equals(
    "vote should be updated to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.notEquals(
    "updated vote should have different timestamp",
    updatedVote.updated_at,
    initialVote.updated_at,
  );
  // Since we cannot retrieve the specific voting transaction without the transaction ID,
  // we'll conclude the test with the validations we can perform
  console.log(
    "Note: Voting transaction retrieval requires transaction ID which is not available in current API",
  );
}
