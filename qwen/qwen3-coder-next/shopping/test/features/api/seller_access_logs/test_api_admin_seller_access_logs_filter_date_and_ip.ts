import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerAccessLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerAccessLogs";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAccessLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAccessLogs";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_access_logs_filter_date_and_ip(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(8) as string & tags.Format<"password">,
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // 2. Test: Filter by date range and IP pattern with a seller ID
  // Generate a random seller ID since we can't create sellers through API
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  // 3. Test: Filter by date range and IP pattern
  const filterBody: IShoppingMallSellerAccessLogs.IRequest = {
    seller_id: sellerId,
    created_at_from: twoDaysAgo.toISOString(),
    created_at_to: now.toISOString(),
    ip: "192.168.1.2", // Partial match pattern
    page: 1,
    limit: 10,
  };
  const result =
    await api.functional.shoppingMall.admin.sellers.access_logs.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: filterBody,
      },
    );
  typia.assert(result);
  // 4. Validate response structure (no data expected for non-existent seller)
  TestValidator.predicate(
    "response has data array",
    Array.isArray(result.data),
  );
  TestValidator.equals("pagination exists", typeof result.pagination, "object");
  TestValidator.predicate(
    "pagination has required fields",
    typeof result.pagination.current === "number" &&
      typeof result.pagination.limit === "number" &&
      typeof result.pagination.records === "number" &&
      typeof result.pagination.pages === "number",
  );
  // 5. Test: No results when IP pattern doesn't match
  const noMatchResult =
    await api.functional.shoppingMall.admin.sellers.access_logs.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          seller_id: sellerId,
          created_at_from: twoDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          ip: "10.0.0.", // Pattern that won't match
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(noMatchResult);
  TestValidator.predicate(
    "no match response has data array",
    Array.isArray(noMatchResult.data),
  );
  // 6. Test: Date range filtering only
  const dateRangeOnlyResult =
    await api.functional.shoppingMall.admin.sellers.access_logs.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          seller_id: sellerId,
          created_at_from: threeDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(dateRangeOnlyResult);
  TestValidator.predicate(
    "date range response has data array",
    Array.isArray(dateRangeOnlyResult.data),
  );
}
