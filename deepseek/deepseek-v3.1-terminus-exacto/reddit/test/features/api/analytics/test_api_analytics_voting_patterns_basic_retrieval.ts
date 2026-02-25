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

export async function test_api_analytics_voting_patterns_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Execute analytics endpoint with basic pagination parameters
  const analyticsResponse =
    await api.functional.communityPlatform.admin.analytics.voting_patterns.index(
      adminConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    analyticsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    analyticsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    analyticsResponse.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate(
    "data is array",
    Array.isArray(analyticsResponse.data),
  );
  // Validate each voting transaction if data exists
  for (const transaction of analyticsResponse.data) {
    typia.assert(transaction);
    // Validate business logic - operation types should be valid
    TestValidator.predicate(
      "transaction has valid operation type",
      transaction.operation_type === "create" ||
        transaction.operation_type === "update" ||
        transaction.operation_type === "delete",
    );
    // Validate business logic - vote types should be valid
    TestValidator.predicate(
      "transaction has valid vote type",
      transaction.vote_type === "upvote" ||
        transaction.vote_type === "downvote",
    );
    // Validate business logic - karma impact should match vote type logic
    TestValidator.predicate(
      "transaction karma impact consistent with vote type",
      (transaction.vote_type === "upvote" && transaction.karma_impact === 1) ||
        (transaction.vote_type === "downvote" &&
          transaction.karma_impact === -1) ||
        (transaction.previous_vote_type !== undefined &&
          transaction.karma_impact === 0),
    );
    // Validate nested user information structure
    typia.assert(transaction.user);
  }
}
