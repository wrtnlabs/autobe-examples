import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first administrator account
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  // Step 2: Create second administrator account
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Step 3: Search administrators with default parameters
  const searchResponse = await api.functional.discussionBoard.admins.index(
    admin1Connection,
    {
      body: {
        // No search filters, using default pagination
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Step 4: Validate pagination metadata
  const pagination = searchResponse.pagination;
  TestValidator.equals(
    "pagination.current should be default page 1",
    pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination.limit should be positive",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records should be at least 2",
    pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination.pages should be calculated correctly",
    pagination.pages >= 1 &&
      pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  // Step 5: Validate response data structure
  TestValidator.predicate(
    "search results should contain data array",
    Array.isArray(searchResponse.data),
  );
  TestValidator.predicate(
    "search results should contain at least 2 administrators",
    searchResponse.data.length >= 2,
  );
  // Step 6: Check individual administrator summaries have required fields
  for (const admin of searchResponse.data) {
    typia.assert(admin);
    TestValidator.predicate(
      "admin summary has id field",
      typeof admin.id === "string",
    );
    TestValidator.predicate(
      "admin summary has email field",
      typeof admin.email === "string",
    );
    TestValidator.predicate(
      "admin summary has admin_grade field",
      typeof admin.admin_grade === "string",
    );
  }
  // Step 7: Verify current administrator appears in results
  const admin1Found = searchResponse.data.some(
    (admin) => admin.id === admin1.id,
  );
  TestValidator.predicate(
    "current authenticated administrator should be in search results",
    admin1Found,
  );
  // Step 8: Verify authorization boundaries - only admin accounts (no member accounts)
  // This is implicit since the endpoint only returns administrator accounts
}
