import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSalesStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSalesStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductSalesStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSalesStat";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_monthly_sales_analytics_access(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  typia.assert(admin);
  // Call the monthly sales analytics endpoint
  const result: IPageIShoppingMallProductSalesStat =
    await api.functional.shoppingMall.admin.analytics.sales.monthly.index(
      adminConnection,
    );
  typia.assert(result);
}
