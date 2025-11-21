import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryUnit";
import type { IShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_inventory_units_unauthenticated_access(
  connection: api.IConnection,
) {
  // Create a minimal request body with no filters
  const requestBody = {} satisfies IShoppingMallInventoryUnit.IRequest;

  // Attempt to access inventory units without authentication
  await TestValidator.httpError(
    "unauthenticated access should return 401 Unauthorized",
    401,
    async () => {
      await api.functional.shoppingMall.inventory.units.index(connection, {
        body: requestBody,
      });
    },
  );
}
