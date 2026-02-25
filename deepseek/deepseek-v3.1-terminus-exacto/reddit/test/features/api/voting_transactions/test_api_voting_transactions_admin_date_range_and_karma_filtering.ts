import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingTransaction";
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
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_voting_transactions_admin_date_range_and_karma_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Create and authenticate multiple users
  const userConnections: api.IConnection[] = [];
  for (let i = 0; i < 3; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(8),
      } satisfies ICommunityPlatformUser.IJoin,
    });
    userConnections.push(userConnection);
  }
  // Create a test post for voting (using a realistic approach)
  // Note: Since we don't have post creation API, we'll work with the assumption
  // that posts already exist or are created elsewhere in the system
  // Create voting transactions with different timestamps
  const baseTime = new Date("2024-01-01T00:00:00Z");
  const testPostId = typia.random<string & tags.Format<"uuid">>();
  // Create votes with specific timestamps and karma impacts
  for (let i = 0; i < 5; i++) {
    const userConnection = RandomGenerator.pick(userConnections);
    const voteType = i % 2 === 0 ? "upvote" : "downvote";
    await generate_random_community_platform_user_posts_votes_create(
      userConnection,
      {
        body: {
          vote_type: voteType,
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: { postId: testPostId },
      },
    );
    // Add delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // Test 1: Filter by date range
  const startDate = new Date(baseTime.getTime() - 24 * 3600000).toISOString(); // 24 hours before base
  const endDate = new Date(baseTime.getTime() + 24 * 3600000).toISOString(); // 24 hours after base
  const dateRangeResult =
    await api.functional.communityPlatform.admin.voting_transactions.index(
      adminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate date range filtering
  for (const transaction of dateRangeResult.data) {
    const transactionTimestamp = new Date(transaction.transaction_timestamp);
    const start = new Date(startDate);
    const end = new Date(endDate);
    TestValidator.predicate(
      "transaction timestamp within date range",
      transactionTimestamp >= start && transactionTimestamp <= end,
    );
  }
  // Test 2: Filter by karma impact (upvotes only)
  const upvoteResult =
    await api.functional.communityPlatform.admin.voting_transactions.index(
      adminConnection,
      {
        body: {
          karma_impact: 1,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(upvoteResult);
  // Validate karma impact filtering for upvotes
  for (const transaction of upvoteResult.data) {
    TestValidator.equals(
      "karma impact for upvote",
      transaction.karma_impact,
      1,
    );
    TestValidator.equals(
      "vote type for upvote",
      transaction.vote_type,
      "upvote",
    );
  }
  // Test 3: Filter by karma impact (downvotes only)
  const downvoteResult =
    await api.functional.communityPlatform.admin.voting_transactions.index(
      adminConnection,
      {
        body: {
          karma_impact: -1,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(downvoteResult);
  // Validate karma impact filtering for downvotes
  for (const transaction of downvoteResult.data) {
    TestValidator.equals(
      "karma impact for downvote",
      transaction.karma_impact,
      -1,
    );
    TestValidator.equals(
      "vote type for downvote",
      transaction.vote_type,
      "downvote",
    );
  }
  // Test 4: Combined filter (date range + karma impact)
  const combinedResult =
    await api.functional.communityPlatform.admin.voting_transactions.index(
      adminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          karma_impact: 1,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate combined filtering
  for (const transaction of combinedResult.data) {
    const transactionTimestamp = new Date(transaction.transaction_timestamp);
    const start = new Date(startDate);
    const end = new Date(endDate);
    TestValidator.predicate(
      "transaction timestamp within date range",
      transactionTimestamp >= start && transactionTimestamp <= end,
    );
    TestValidator.equals(
      "karma impact for upvote",
      transaction.karma_impact,
      1,
    );
  }
  // Test 5: Empty result for future date range
  const futureStart = new Date("2030-01-01T00:00:00Z").toISOString();
  const futureEnd = new Date("2030-12-31T23:59:59Z").toISOString();
  const futureResult =
    await api.functional.communityPlatform.admin.voting_transactions.index(
      adminConnection,
      {
        body: {
          start_date: futureStart,
          end_date: futureEnd,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(futureResult);
  TestValidator.equals(
    "no transactions in future date range",
    futureResult.data.length,
    0,
  );
}
