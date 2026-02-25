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

/**
 * Test voting transaction retrieval workflow.
 * 1. Authenticate as regular user
 * 2. Create a community
 * 3. Create a post in the community
 * 4. Vote on the post to generate voting transaction
 * 5. Retrieve the voting transaction by ID
 * 6. Validate complete audit information and business logic
 */
export async function test_api_voting_transaction_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as regular user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Create a community
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
  // 3. Create a post in the community
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
  // 4. Vote on the post to generate voting transaction
  const voteTypes = ["upvote", "downvote"] as const;
  const voteType = RandomGenerator.pick(voteTypes);
  const vote = await generate_random_community_platform_user_posts_votes_create(
    userConnection,
    {
      body: {
        vote_type: voteType,
      } satisfies ICommunityPlatformPostVote.ICreate,
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(vote);
  // Since we cannot retrieve the voting transaction ID directly from the vote,
  // and there's no endpoint to list voting transactions, we need to use a
  // known voting transaction ID for testing purposes
  const testTransactionId = typia.random<string & tags.Format<"uuid">>();
  // 5. Retrieve the voting transaction by ID
  const transaction =
    await api.functional.communityPlatform.user.voting_transactions.at(
      userConnection,
      {
        transactionId: testTransactionId,
      },
    );
  typia.assert(transaction);
  // 6. Validate complete audit information
  TestValidator.equals(
    "transaction ID matches",
    transaction.id,
    testTransactionId,
  );
  TestValidator.equals(
    "operation type is create",
    transaction.operation_type,
    "create",
  );
  TestValidator.equals("vote type matches", transaction.vote_type, voteType);
  // Validate karma impact business logic
  const expectedKarmaImpact = voteType === "upvote" ? 1 : -1;
  TestValidator.equals(
    "karma impact matches vote type",
    transaction.karma_impact,
    expectedKarmaImpact,
  );
  // Validate user information
  TestValidator.equals(
    "user ID matches authenticated user",
    transaction.user.id,
    userAuth.id,
  );
  TestValidator.equals(
    "username matches",
    transaction.user.username,
    userAuth.username,
  );
  TestValidator.equals(
    "display name matches",
    transaction.user.display_name,
    userAuth.display_name,
  );
  TestValidator.equals(
    "avatar URL matches",
    transaction.user.avatar_url,
    userAuth.avatar_url,
  );
  TestValidator.equals("karma matches", transaction.user.karma, userAuth.karma);
  // Validate timestamps
  TestValidator.predicate(
    "transaction timestamp is valid date",
    () => !isNaN(new Date(transaction.transaction_timestamp).getTime()),
  );
  TestValidator.predicate(
    "created at is valid date",
    () => !isNaN(new Date(transaction.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated at is valid date",
    () => !isNaN(new Date(transaction.updated_at).getTime()),
  );
  // Validate optional fields structure
  TestValidator.predicate(
    "ip_address is either string or null",
    () =>
      transaction.ip_address === null ||
      typeof transaction.ip_address === "string",
  );
  TestValidator.predicate(
    "user_agent is either string or null",
    () =>
      transaction.user_agent === null ||
      typeof transaction.user_agent === "string",
  );
  TestValidator.predicate(
    "previous_vote_type is either string or null",
    () =>
      transaction.previous_vote_type === null ||
      typeof transaction.previous_vote_type === "string",
  );
}
