import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

export async function test_api_order_list_unauthenticated_rejection(
  connection: api.IConnection,
) {
  // Create a fresh connection with no authentication headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Validate that unauthenticated request to list orders results in 401 Unauthorized
  await TestValidator.error(
    "unauthenticated user should be rejected with 401",
    async () => {
      await api.functional.shoppingMall.orders.index(unauthConn, {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      });
    },
  );
}
