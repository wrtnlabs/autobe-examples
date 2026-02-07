import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_inventory_analytics_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin using utility function
  const authResult = await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // Use authenticated connection for analytics request
  const analyticsConnection: api.IConnection = { host: connection.host };
  analyticsConnection.headers = adminConnection.headers;
  // Since IShoppingMallAdminAction.IRequest is defined as empty object {},
  // we must pass an empty request body - no date filtering is possible
  const requestBody = {} satisfies IShoppingMallAdminAction.IRequest;
  // Call inventory analytics endpoint with empty body (only valid option per schema)
  const response =
    await api.functional.shoppingMall.admin.admin.analytics.inventory.index(
      analyticsConnection,
      { body: requestBody },
    );
  // Validate response structure
  typia.assert(response);
  // Validate pagination
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate that we received data
  TestValidator.predicate("data array is not empty", response.data.length > 0);
}
