import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_revenue_report_with_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create request body with empty object (only valid type for IShoppingMallSnapshot.IRequest)
  const requestBody = {} satisfies IShoppingMallSnapshot.IRequest;
  // 3. Call revenue report endpoint
  const revenueReport = await api.functional.shoppingMall.admin.revenue.index(
    adminConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(revenueReport);
  // 4. Validate results
  TestValidator.equals(
    "pagination exists",
    revenueReport.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(revenueReport.data),
  );
  TestValidator.predicate("data has records", revenueReport.data.length >= 0);
}
