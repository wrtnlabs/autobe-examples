import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_inventory_unit_creation(
  connection: api.IConnection,
) {
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: typia.random<IShoppingMallSeller.ICreate>(),
    });
  typia.assert(seller);

  const inventoryUnit: IShoppingMallInventoryUnit =
    await api.functional.shoppingMall.seller.inventory.units.create(
      connection,
      {
        body: typia.random<string>() satisfies IShoppingMallInventoryUnit.ICreate,
      },
    );
  typia.assert(inventoryUnit);
}
