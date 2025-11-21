import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_inventory_unit_retrieval_by_valid_id(
  connection: api.IConnection,
) {
  // 1. Seller registers via join
  const sellerData = typia.random<IShoppingMallSeller.ICreate>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // 2. Creates an inventory unit
  // Since IShoppingMallInventoryUnit.ICreate is defined as string, we must generate a string
  // The example implementation references IShoppingMallInventoryUnit.ICreate as string, and there are no documented required fields
  // Therefore, we use a placeholder string, though the exact content is not defined in the provided schema
  const inventoryUnitData: string = typia.random<string>();
  const createdUnit: IShoppingMallInventoryUnit =
    await api.functional.shoppingMall.seller.inventory.units.create(
      connection,
      {
        body: inventoryUnitData,
      },
    );
  typia.assert(createdUnit);

  // 3. Retrieves the unit using the assigned unitId
  const retrievedUnit: IShoppingMallInventoryUnit =
    await api.functional.shoppingMall.inventory.units.getByUnitid(connection, {
      unitId: createdUnit,
    });
  typia.assert(retrievedUnit);

  // Since IShoppingMallInventoryUnit is defined as string, we can only validate that retrieval succeeded
  // There are no object properties to validate
  TestValidator.equals(
    "retrieved unit matches created unit",
    retrievedUnit,
    createdUnit,
  );
}
