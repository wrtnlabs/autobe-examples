import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoyaltyPointTransaction";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";

export async function test_api_loyalty_point_transaction_history_empty_results(
  connection: api.IConnection,
) {
  // Generate a random customer_id that does not exist in the system
  const customer_id: string = typia.random<string & tags.Format<"uuid">>();

  // Use a future date range where no transactions should exist
  const now = new Date();
  const startDate = new Date(now.getTime() + 86400000 * 365).toISOString(); // 1 year in the future
  const endDate = new Date(now.getTime() + 86400000 * 366).toISOString(); // 1 year + 1 day in the future

  // Call the endpoint to query loyalty point transactions with the non-existent customer_id and future date range
  const result: IPageIShoppingMallLoyaltyPointTransaction.ISummary =
    await api.functional.shoppingMall.promotions.loyalty_point_transactions.index(
      connection,
      {
        body: {
          customer_id,
          start_date: startDate,
          end_date: endDate,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallLoyaltyPointTransaction.IRequest,
      },
    );
  typia.assert(result);

  // Validate that the result is an empty array
  TestValidator.equals(
    "transaction history should be empty",
    result.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should show 0 records",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination should show 0 pages",
    result.pagination.pages,
    0,
  );
}
