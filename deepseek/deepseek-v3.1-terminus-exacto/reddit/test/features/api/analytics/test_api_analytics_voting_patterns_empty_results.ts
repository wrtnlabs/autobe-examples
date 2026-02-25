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

export async function test_api_analytics_voting_patterns_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Update admin connection with authorization token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: authResult.token.access,
  };
  // Create analytics request with filters designed to return empty results
  const request = {
    user_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent user ID
    start_date: new Date(Date.now() + 86400000).toISOString(), // Future date (tomorrow)
    end_date: new Date(Date.now() + 172800000).toISOString(), // Future date (day after tomorrow)
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformVotingTransaction.IRequest;
  // Execute analytics endpoint
  const response =
    await api.functional.communityPlatform.admin.analytics.voting_patterns.index(
      adminConnection,
      { body: request },
    );
  typia.assert(response);
  // Validate pagination metadata with zero records
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
  // Validate empty data array
  TestValidator.equals("empty data array", response.data.length, 0);
  // Validate schema structure is maintained
  TestValidator.predicate(
    "response has pagination property",
    "pagination" in response,
  );
  TestValidator.predicate("response has data property", "data" in response);
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Validate no error properties exist in response
  TestValidator.predicate("no error property", !("error" in response));
  TestValidator.predicate("no success property", !("success" in response));
}
