import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoyaltyPointTransaction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";

export async function test_api_admin_loyalty_points_filter_by_date_range(
  connection: api.IConnection,
) {
  // Authenticate as admin to access loyalty point transactions
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Generate random date range for filtering
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const endDate = now.toISOString(); // Today

  // Filter loyalty points by date range
  const result: IPageIShoppingMallLoyaltyPointTransaction =
    await api.functional.shoppingMall.admin.promotions.loyalty_points.index(
      connection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallLoyaltyPointTransaction.IRequest,
      },
    );
  typia.assert(result);

  // Validate pagination structure
  TestValidator.equals("pagination structure", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);

  // Validate that all transactions are within the date range
  for (const transaction of result.data) {
    TestValidator.predicate(
      "transaction created within date range",
      transaction.created_at >= startDate && transaction.created_at <= endDate,
    );
  }

  // Validate that we got data (not empty)
  TestValidator.predicate(
    "at least one transaction found",
    result.data.length > 0,
  );
}
