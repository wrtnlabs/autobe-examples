import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";
import type { IPageICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingTransaction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_moderator_voting_transactions_suspicious_patterns(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // Create multiple users for coordinated voting
  const userConnections: api.IConnection[] = ArrayUtil.repeat(5, () => ({
    host: connection.host,
  }));
  const users: ICommunityPlatformUser.IAuthorized[] = [];
  for (let i = 0; i < userConnections.length; i++) {
    const user = await authorize_user_join(userConnections[i], {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.alphabets(8),
      } satisfies ICommunityPlatformUser.IJoin,
    });
    users.push(user);
  }
  // Create posts for voting
  const posts: ICommunityPlatformPost[] = [];
  for (const userConnection of userConnections.slice(0, 2)) {
    const post = await generate_random_community_platform_user_posts_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          community_name: "general",
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    posts.push(post);
  }
  // Generate coordinated voting patterns (same users voting rapidly on same posts)
  const targetPost = posts[0];
  // Pattern 1: Rapid sequential voting from same users
  for (let i = 0; i < 3; i++) {
    for (const userConnection of userConnections.slice(0, 3)) {
      await generate_random_community_platform_user_posts_votes_create(
        userConnection,
        {
          body: {
            vote_type: "upvote",
          } satisfies ICommunityPlatformPostVote.ICreate,
          params: { postId: targetPost.id },
        },
      );
      // Small delay to simulate rapid but sequential voting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  // Pattern 2: Vote manipulation (+1 followed by -1)
  for (const userConnection of userConnections.slice(3, 5)) {
    await generate_random_community_platform_user_posts_votes_create(
      userConnection,
      {
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: { postId: targetPost.id },
      },
    );
    await generate_random_community_platform_user_posts_votes_create(
      userConnection,
      {
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: { postId: targetPost.id },
      },
    );
  }
  // Search for suspicious patterns with various filters
  // Filter 1: Rapid voting within short time frame
  const rapidVotingResults =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          start_date: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // Last 2 minutes
          end_date: new Date().toISOString(),
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(rapidVotingResults);
  // Filter 2: Specific karma impact patterns
  const karmaImpactResults =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          karma_impact: 1,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(karmaImpactResults);
  // Filter 3: Operation type filtering
  const createOperationResults =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          operation_type: "create",
          limit: 15,
          page: 1,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(createOperationResults);
  // Validate search functionality
  TestValidator.predicate(
    "rapid voting search should return results",
    rapidVotingResults.data.length > 0,
  );
  TestValidator.predicate(
    "karma impact search should return results",
    karmaImpactResults.data.length > 0,
  );
  TestValidator.predicate(
    "operation type search should return results",
    createOperationResults.data.length > 0,
  );
  // Verify transaction data structure
  if (rapidVotingResults.data.length > 0) {
    const transaction = rapidVotingResults.data[0];
    TestValidator.equals(
      "transaction should have valid operation type",
      typeof transaction.operation_type,
      "string",
    );
    TestValidator.equals(
      "transaction should have valid vote type",
      typeof transaction.vote_type,
      "string",
    );
    TestValidator.predicate(
      "transaction should have valid karma impact",
      transaction.karma_impact === 1 || transaction.karma_impact === -1,
    );
    TestValidator.predicate(
      "transaction should have valid timestamp",
      !isNaN(new Date(transaction.transaction_timestamp).getTime()),
    );
  }
}
