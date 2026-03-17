import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorPasswordReset";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test status filtering functionality for administrator requests.
 * Tests the PATCH /shoppingMall/administrator/administrator-requests endpoint
 * with various status filter values to verify proper filtering behavior.
 */
export async function test_api_administrator_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(superAdminConnection, {});
  // 2. Test filter by 'pending' status
  const pendingBody = {
    status: "pending" as const,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdministratorPasswordReset.IRequest;
  const pendingResult =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      superAdminConnection,
      { body: pendingBody },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "all pending results have pending status",
    pendingResult.data.every((item) => item.status === "pending"),
  );
  // 3. Test filter by 'approved' status
  const approvedBody = {
    status: "approved" as const,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdministratorPasswordReset.IRequest;
  const approvedResult =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      superAdminConnection,
      { body: approvedBody },
    );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "all approved results have approved status",
    approvedResult.data.every((item) => item.status === "approved"),
  );
  // 4. Test filter by 'rejected' status
  const rejectedBody = {
    status: "rejected" as const,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdministratorPasswordReset.IRequest;
  const rejectedResult =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      superAdminConnection,
      { body: rejectedBody },
    );
  typia.assert(rejectedResult);
  TestValidator.predicate(
    "all rejected results have rejected status",
    rejectedResult.data.every((item) => item.status === "rejected"),
  );
  // 5. Test with no status filter (null) - returns all requests
  const allRequestsBody = {
    status: null,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdministratorPasswordReset.IRequest;
  const allRequestsResult =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      superAdminConnection,
      { body: allRequestsBody },
    );
  typia.assert(allRequestsResult);
  TestValidator.predicate(
    "pagination current page is 1",
    allRequestsResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    allRequestsResult.pagination.limit === 10,
  );
}
