import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";

export async function test_api_shopping_mall_inventory_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Join as a new customer
  const customerCreateBody = {
    email: `test_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Test1234!",
    href: "https://example.com/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Create initial inventory record dependency
  // For this test, we'll generate a skuCode string
  const skuCode: string = `SKU-${RandomGenerator.alphaNumeric(6)}`;

  // Create inventory initial data
  const initialInventoryBody = {
    quantity: typia.random<number & tags.Type<"int32">>(),
    reserved_quantity: typia.random<number & tags.Type<"int32">>(),
    restock_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  } satisfies IShoppingMallInventory.ICreate;

  const inventory: IShoppingMallInventory =
    await api.functional.shoppingMall.customer.shoppingMallProductVariants.shoppingMallInventories.create(
      connection,
      {
        skuCode: skuCode,
        body: initialInventoryBody,
      },
    );
  typia.assert(inventory);

  // 3. Update the inventory record
  const updatedQuantity = initialInventoryBody.quantity + 10;
  const updatedReservedQuantity = Math.max(
    0,
    initialInventoryBody.reserved_quantity - 2,
  );
  const updatedRestockDate: string | null = new Date(
    Date.now() + 3 * 24 * 3600 * 1000,
  ).toISOString();

  // Always include all required fields
  const updateBody = {
    quantity: updatedQuantity,
    reserved_quantity: updatedReservedQuantity,
    restock_date: updatedRestockDate,
    // created_at and updated_at & deleted_at can be optional nullable
    created_at: inventory.created_at,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IShoppingMallInventory.IUpdate;

  const updatedInventory: IShoppingMallInventory =
    await api.functional.shoppingMall.customer.shoppingMallProductVariants.shoppingMallInventories.update(
      connection,
      {
        skuCode: skuCode,
        shoppingMallInventoryId: inventory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedInventory);

  // 4. Validate that update response reflects the changes
  TestValidator.equals(
    "inventory id is unchanged",
    updatedInventory.id,
    inventory.id,
  );
  TestValidator.equals(
    "shopping_mall_product_variant_id is unchanged",
    updatedInventory.shopping_mall_product_variant_id,
    inventory.shopping_mall_product_variant_id,
  );
  TestValidator.equals(
    "quantity updated correctly",
    updatedInventory.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "reserved_quantity updated correctly",
    updatedInventory.reserved_quantity,
    updatedReservedQuantity,
  );
  TestValidator.equals(
    "restock_date updated correctly",
    updatedInventory.restock_date,
    updatedRestockDate,
  );

  TestValidator.equals(
    "created_at is unchanged",
    updatedInventory.created_at,
    inventory.created_at,
  );

  TestValidator.predicate(
    "updated_at has changed",
    updatedInventory.updated_at !== inventory.updated_at,
  );

  TestValidator.equals(
    "deleted_at is cleared",
    updatedInventory.deleted_at,
    null,
  );
}
