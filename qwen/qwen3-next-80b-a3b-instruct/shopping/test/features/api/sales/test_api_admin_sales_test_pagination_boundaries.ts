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

export async function test_api_admin_sales_test_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<IShoppingMallAdmin.ILogin>(),
  });
  // 2. Request sales data — empty body as IShoppingMallOrder.IRequest allows no parameters
  const request: IShoppingMallOrder.IRequest = {};
  const result = await api.functional.shoppingMall.admin.sales.index(
    adminConnection,
    {
      body: request,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata reflects server-imposed boundary (limit=100)
  TestValidator.equals(
    "limit matches server default",
    result.pagination.limit,
    100,
  );
  TestValidator.equals(
    "current page is first page",
    result.pagination.current,
    1,
  );
  TestValidator.predicate("total records exist", result.pagination.records > 0);
  TestValidator.predicate("pages at least 1", result.pagination.pages >= 1);
  // 4. Validate data contains exactly 100 records (maximum page size boundary)
  TestValidator.equals("data length equals limit", result.data.length, 100);
  // 5. Validate all records are valid (non-null, non-undefined)
  TestValidator.predicate(
    "all data items are valid",
    result.data.every((item) => item !== undefined && item !== null),
  );
}
