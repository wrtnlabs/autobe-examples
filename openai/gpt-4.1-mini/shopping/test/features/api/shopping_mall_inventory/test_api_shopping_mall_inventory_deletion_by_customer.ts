import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";

export async function test_api_shopping_mall_inventory_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signs up via join endpoint
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const newCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "TestPassword123!",
        href: "https://test.com/signup",
        referrer: "https://test.com/referrer",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(newCustomer);

  // 2. Create inventory record for a product variant (skuCode is randomly generated)
  const skuCode = RandomGenerator.alphaNumeric(10);
  const inventoryCreateInput = {
    quantity: 100,
    reserved_quantity: 0,
    restock_date: null,
  } satisfies IShoppingMallInventory.ICreate;
  const inventory: IShoppingMallInventory =
    await api.functional.shoppingMall.customer.shoppingMallProductVariants.shoppingMallInventories.create(
      connection,
      {
        skuCode,
        body: inventoryCreateInput,
      },
    );
  typia.assert(inventory);

  // 3. Delete the above created inventory record
  await api.functional.shoppingMall.customer.shoppingMallProductVariants.shoppingMallInventories.erase(
    connection,
    {
      skuCode,
      shoppingMallInventoryId: inventory.id,
    },
  );
  // Ensure deletion succeeded by awaiting without error
  // No content expected on successful delete
}
