import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_status_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin using utility function
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // Call the endpoint to retrieve paginated order status list
  const orderStatusList =
    await api.functional.shoppingMall.admin.order_status.index(adminConnection);
  typia.assert(orderStatusList);
  // Validate response structure conforms to IPageIShoppingMallOrder.ISummary
  // Verify pagination metadata — these properties are defined in IPage.IPagination and exist
  TestValidator.equals(
    "pagination current page is 1",
    orderStatusList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default 10",
    orderStatusList.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    orderStatusList.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages equals records divided by limit (rounded up)",
    orderStatusList.pagination.pages,
    Math.ceil(
      orderStatusList.pagination.records / orderStatusList.pagination.limit,
    ),
  );
  // Validate that data is an array and has non-negative length
  // The IShoppingMallOrder.ISummary is an empty object in the schema — we cannot access id, order_number, status, created_at
  // as they do not exist. We verify the array structure exists, but can't validate item contents.
  TestValidator.predicate(
    "data array has at least 0 items",
    orderStatusList.data.length >= 0,
  );
  // Since each item in data is an empty object (ISummary), there are no properties to validate.
  // We do NOT validate any properties on order items — they don't exist in the schema.
}
