import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test retrieving a paginated list of inventory audit logs without
 * filters as the request DTO does not define filtering properties.
 * The test verifies result pagination metadata is correct, data
 * items have valid structure and access control enforcement is correct
 * for administrator role.
 */
export async function test_api_administrator_inventory_audit_logs_filtered_by_product_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // For this test, since IShoppingMallAdministrator.IJoin has no properties,
  // just an empty object is passed
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Update adminConnection with the valid token header
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Fetch inventory audit logs with empty filter (no options as per DTO)
  const requestBody: IShoppingMallInventoryHistory.IRequest = {};
  // Send request
  const response =
    await api.functional.shoppingMall.administrator.inventory.audit_logs.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 3. Validate response structure
  // Pagination metadata validations
  TestValidator.predicate(
    "pagination current page",
    typeof response.pagination.current === "number" &&
      response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit count",
    typeof response.pagination.limit === "number" &&
      response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total records",
    typeof response.pagination.records === "number" &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages",
    typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );
  // 4. Data array validations
  for (const item of response.data) {
    typia.assert(item);
  }
  // 5. Authorization error tests
  // Create a base connection with no authorization headers
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized without token", 401, async () => {
    await api.functional.shoppingMall.administrator.inventory.audit_logs.index(
      unauthorizedConnection,
      { body: requestBody },
    );
  });
}
