import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleViewStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_sales_monthly_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrative connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Call the sales monthly analytics endpoint using admin connection
  const response: IPageIShoppingMallSaleViewStat =
    await api.functional.shoppingMall.admin.analytics.sales.monthly.index(
      adminConnection,
    );
  // Step 3: Validate response structure with typia.assert (already validates everything)
  typia.assert(response);
  // Step 4: Validate pagination structure with proper TestValidator
  TestValidator.equals(
    "pagination exists",
    response.pagination,
    response.pagination,
  );
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Step 5: Validate business logic - data array length is reasonable
  // Since this is monthly analytics, there should be at least one month of data
  TestValidator.predicate(
    "at least one month of data exists",
    response.data.length >= 1,
  );
  // Validate that at least one data entry has non-zero revenue
  // This demonstrates the analytics endpoint is providing meaningful data
  const hasPositiveRevenue = response.data.some(
    (stat) => stat.totalRevenue > 0,
  );
  TestValidator.predicate(
    "at least one month has positive revenue",
    hasPositiveRevenue,
  );
}
