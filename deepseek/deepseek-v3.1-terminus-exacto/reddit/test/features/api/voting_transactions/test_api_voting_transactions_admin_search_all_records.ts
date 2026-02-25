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

export async function test_api_voting_transactions_admin_search_all_records(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Search all voting transactions with default pagination
  const response =
    await api.functional.communityPlatform.admin.voting_transactions.index(
      adminConnection,
      {
        body: {
          user_id: null,
          operation_type: null,
          vote_type: null,
          karma_impact: null,
          start_date: null,
          end_date: null,
          page: undefined,
          limit: undefined,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    response.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    response.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has total records",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has total pages",
    response.pagination.pages >= 0,
    true,
  );
  // Validate data array exists
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // Validate transaction count matches pagination
  TestValidator.equals(
    "data length matches pagination",
    response.data.length <= response.pagination.limit,
    true,
  );
  // Validate transaction ordering (most recent first)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const currentTimestamp = new Date(response.data[i].transaction_timestamp);
      const previousTimestamp = new Date(
        response.data[i - 1].transaction_timestamp,
      );
      TestValidator.predicate(
        "transactions sorted descending",
        currentTimestamp <= previousTimestamp,
      );
    }
  }
  // Validate karma impact values are valid
  for (const transaction of response.data) {
    TestValidator.predicate(
      "karma impact is valid",
      transaction.karma_impact === 1 ||
        transaction.karma_impact === -1 ||
        transaction.karma_impact === 0,
    );
  }
}
