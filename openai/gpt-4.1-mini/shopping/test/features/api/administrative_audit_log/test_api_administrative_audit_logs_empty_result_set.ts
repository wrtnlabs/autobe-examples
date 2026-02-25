import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrativeAuditLog";
import type { IShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrative audit logs search endpoint with filters that yield no results.
 *
 * This test performs the following steps:
 * 1. Creates a new administrator account to obtain authorization.
 * 2. Uses an authorized administrator connection to call the administrative audit logs index endpoint.
 * 3. Uses filter parameters that are expected to produce no matching audit logs.
 * 4. Confirms the response data array is empty and pagination metadata is valid.
 * 5. Ensures no errors occur and the endpoint is accessible by authorized administrators.
 */
export async function test_api_administrative_audit_logs_empty_result_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "abcdefghg",
    },
  });
  // Attach authorization header
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Prepare filter request parameters that should yield no results
  // Use an unlikely UUID for administratorId filter to ensure empty
  const unlikelyUuid = typia.random<string & typia.tags.Format<"uuid">>();
  const body: IShoppingMallAdministrativeAuditLog.IRequest = {
    administratorId: unlikelyUuid,
    limit: 10,
    offset: 0,
  };
  // 3. Call administrative audit logs index endpoint
  const output =
    await api.functional.shoppingMall.administrator.administrativeAuditLogs.index(
      adminConnection,
      { body },
    );
  // 4. Assert output
  typia.assert(output);
  // Pagination metadata validation
  TestValidator.predicate(
    "pagination current page is positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is zero",
    output.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination pages count is zero",
    output.pagination.pages === 0,
  );
  // Data array must be empty
  TestValidator.equals("data array length", output.data.length, 0);
}
