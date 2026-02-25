import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMvTagUsageStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_tag_usage_stats_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // Test retrieving tag usage statistics with default pagination and no filters.
  // This test authenticates as an administrator, then calls the PATCH
  // /discussionBoard/administrator/tags/usage-stats endpoint with an empty request body
  // to verify the response contains paginated data. The pagination metadata
  // should have page 1, default limit, and valid records count. It also confirms
  // the data is sorted descending by articleCount (usage count). All response data
  // types must be asserted using typia.assert for strict type safety.
  // Step 1: Authorize administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test-password",
    },
  });
  typia.assert(admin);
  // Update adminConnection headers with valid token
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = admin.token.access;
  // Step 2: Call tag usage stats endpoint with empty request body (defaults)
  const output =
    await api.functional.discussionBoard.administrator.tags.usage_stats.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(output);
  // Step 3: Validate pagination metadata correctness
  TestValidator.predicate(
    "pagination current page is >= 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is >= 0",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is >= 0",
    output.pagination.pages >= 0,
  );
  // Step 4: Validate sorting descending by articleCount
  for (let i = 1; i < output.data.length; ++i) {
    TestValidator.predicate(
      `data[${i - 1}].articleCount >= data[${i}].articleCount`,
      output.data[i - 1].articleCount >= output.data[i].articleCount,
    );
  }
}
