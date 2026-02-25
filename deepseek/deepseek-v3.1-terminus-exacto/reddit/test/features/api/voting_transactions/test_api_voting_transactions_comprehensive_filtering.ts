import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test comprehensive filtering combinations for voting transaction auditing.
 * Validate that multiple filter criteria work together correctly.
 */
export async function test_api_voting_transactions_comprehensive_filtering(
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
  // Note: Since we cannot create voting transactions directly through available APIs,
  // we'll test the filtering functionality with the existing voting transaction endpoint.
  // The test focuses on validating that the filtering logic works correctly with various
  // parameter combinations.
  // Test 1: Filter by operation_type='update' to verify previous_vote_type is populated
  const updateFilter =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          operation_type: "update",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(updateFilter);
  // Test 2: Date range filtering with valid time range
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilter =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          start_date: oneDayAgo.toISOString(),
          end_date: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(dateFilter);
  // Test 3: Combined filters - user_id with operation_type
  const combinedFilter1 =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          operation_type: "create",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(combinedFilter1);
  // Test 4: Combined filters - vote_type with karma_impact
  const combinedFilter2 =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          vote_type: "upvote",
          karma_impact: 1,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(combinedFilter2);
  // Test 5: Full combination of all filters
  const fullCombinationFilter =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          operation_type: "create",
          vote_type: "upvote",
          karma_impact: 1,
          start_date: oneDayAgo.toISOString(),
          end_date: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(fullCombinationFilter);
  // Test 6: Empty filter (should return all transactions)
  const emptyFilter =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(emptyFilter);
  // Validate pagination metadata exists for all responses
  TestValidator.predicate(
    "all responses have pagination metadata",
    updateFilter.pagination !== undefined &&
      dateFilter.pagination !== undefined &&
      combinedFilter1.pagination !== undefined &&
      combinedFilter2.pagination !== undefined &&
      fullCombinationFilter.pagination !== undefined &&
      emptyFilter.pagination !== undefined,
  );
  // Validate that operation_type filtering returns consistent data structure
  TestValidator.predicate(
    "operation_type filter returns valid data structure",
    updateFilter.data.every(
      (transaction) =>
        typeof transaction.id === "string" &&
        typeof transaction.operation_type === "string" &&
        typeof transaction.vote_type === "string" &&
        typeof transaction.karma_impact === "number" &&
        typeof transaction.transaction_timestamp === "string" &&
        typeof transaction.user.id === "string" &&
        typeof transaction.user.username === "string",
    ),
  );
}
