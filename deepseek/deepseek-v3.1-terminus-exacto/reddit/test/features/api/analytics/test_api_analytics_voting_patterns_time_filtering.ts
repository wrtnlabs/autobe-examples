import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

export async function test_api_analytics_voting_patterns_time_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Calculate date range for filtering (last 7 days)
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  // 3. Execute analytics endpoint with time filtering
  const response =
    await api.functional.communityPlatform.admin.analytics.voting_patterns.index(
      adminConnection,
      {
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          operation_type: "create" as const,
          vote_type: "upvote" as const,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response structure and pagination
  TestValidator.equals(
    "pagination structure",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate("has current page", response.pagination.current >= 1);
  TestValidator.predicate("has limit", response.pagination.limit >= 1);
  TestValidator.predicate(
    "has records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("has pages count", response.pagination.pages >= 0);
  // 5. Validate data array
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // 6. Validate each transaction meets filtering criteria
  for (const transaction of response.data) {
    typia.assert(transaction);
    // Validate operation type filter
    TestValidator.equals(
      "operation type is create",
      transaction.operation_type,
      "create",
    );
    // Validate vote type filter
    TestValidator.equals(
      "vote type is upvote",
      transaction.vote_type,
      "upvote",
    );
    // Validate karma impact
    TestValidator.equals("karma impact is +1", transaction.karma_impact, 1);
    // Validate transaction timestamp is within date range
    const transactionDate = new Date(transaction.transaction_timestamp);
    TestValidator.predicate(
      "transaction within start date",
      transactionDate >= startDate,
    );
    TestValidator.predicate(
      "transaction within end date",
      transactionDate <= endDate,
    );
    // Validate user summary structure
    TestValidator.equals("user has id", typeof transaction.user.id, "string");
    TestValidator.equals(
      "user has username",
      typeof transaction.user.username,
      "string",
    );
    TestValidator.predicate("user has karma", transaction.user.karma >= 0);
    TestValidator.equals(
      "user has created_at",
      typeof transaction.user.created_at,
      "string",
    );
  }
  // 7. Validate pagination calculations
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculation",
      response.pagination.pages ===
        Math.ceil(response.pagination.records / response.pagination.limit),
    );
  }
  // 8. Test error scenarios
  // Invalid date range (end date before start date)
  await TestValidator.error("invalid date range should fail", async () => {
    await api.functional.communityPlatform.admin.analytics.voting_patterns.index(
      adminConnection,
      {
        body: {
          start_date: endDate.toISOString(),
          end_date: startDate.toISOString(),
          operation_type: "create",
          vote_type: "upvote",
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  });
  // Invalid operation type
  await TestValidator.error("invalid operation type should fail", async () => {
    await api.functional.communityPlatform.admin.analytics.voting_patterns.index(
      adminConnection,
      {
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          operation_type: "invalid_operation" as any,
          vote_type: "upvote",
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  });
}
