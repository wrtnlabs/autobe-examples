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

export async function test_api_voting_transactions_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
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
  // Test basic filtering with empty parameters - this should return an empty page
  // since the user has no voting transactions yet
  const emptyFilterResponse =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: null,
          operation_type: null,
          vote_type: null,
          karma_impact: null,
          start_date: null,
          end_date: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  // Validate pagination structure for empty result set
  TestValidator.equals(
    "current page",
    emptyFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit", emptyFilterResponse.pagination.limit, 10);
  TestValidator.equals(
    "records count",
    emptyFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals("pages count", emptyFilterResponse.pagination.pages, 0);
  TestValidator.equals("empty data array", emptyFilterResponse.data.length, 0);
  // Test filtering by user_id - should return empty since no transactions exist
  const userFilterResponse =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          operation_type: null,
          vote_type: null,
          karma_impact: null,
          start_date: null,
          end_date: null,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(userFilterResponse);
  // Validate empty response for user-specific filter
  TestValidator.equals(
    "user filter records",
    userFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "user filter data empty",
    userFilterResponse.data.length,
    0,
  );
  // Test pagination with different parameters
  const paginationTest =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          operation_type: null,
          vote_type: null,
          karma_impact: null,
          start_date: null,
          end_date: null,
          page: 2,
          limit: 3,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Even with page 2, should return empty since no records exist
  TestValidator.equals(
    "page 2 current page",
    paginationTest.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", paginationTest.pagination.limit, 3);
  TestValidator.equals("page 2 records", paginationTest.pagination.records, 0);
  TestValidator.equals("page 2 pages", paginationTest.pagination.pages, 0);
  TestValidator.equals("page 2 data empty", paginationTest.data.length, 0);
  // Test that the API handles various filter combinations gracefully
  // even when no data exists
  const filterCombinations = [
    {
      operation_type: "create" as const,
      vote_type: "upvote" as const,
      karma_impact: 1,
    },
    {
      operation_type: "update" as const,
      vote_type: "downvote" as const,
      karma_impact: -1,
    },
    { operation_type: "delete" as const },
  ];
  for (const filters of filterCombinations) {
    const combinationResponse =
      await api.functional.communityPlatform.user.voting_transactions.index(
        userConnection,
        {
          body: {
            user_id: user.id,
            operation_type: filters.operation_type || null,
            vote_type: filters.vote_type || null,
            karma_impact: filters.karma_impact || null,
            start_date: null,
            end_date: null,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformVotingTransaction.IRequest,
        },
      );
    typia.assert(combinationResponse);
    // All combinations should return empty results for new user
    TestValidator.equals(
      `combination ${JSON.stringify(filters)} records`,
      combinationResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      `combination ${JSON.stringify(filters)} data empty`,
      combinationResponse.data.length,
      0,
    );
  }
}
