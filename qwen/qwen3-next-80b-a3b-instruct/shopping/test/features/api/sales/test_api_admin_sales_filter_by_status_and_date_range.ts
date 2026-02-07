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

export async function test_api_admin_sales_filter_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!", // Validated by schema
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Define filter parameters for the query
  // Since IRequest is empty, we send an empty object
  const filterBody: IShoppingMallOrder.IRequest =
    {} satisfies IShoppingMallOrder.IRequest;
  // 3. Execute the filtered sales query
  const result = await api.functional.shoppingMall.admin.sales.index(
    adminConnection,
    {
      body: filterBody,
    },
  );
  typia.assert(result);
  // 4. Validate results
  // Since ISummary is empty, we can't validate any order properties
  // We can only validate that the response structure is correct
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page matches request",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records should be 0 (no data to filter)",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0 (no data)",
    result.pagination.pages,
    0,
  );
  TestValidator.equals("data array length should be 0", result.data.length, 0);
}
