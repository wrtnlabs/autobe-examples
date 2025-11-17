import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";

/**
 * Validate retrieval of inventory details by SKU and inventory ID.
 *
 * This test covers the full scenario of a customer joining the platform,
 * creating an inventory record for a specific product variant SKU, and
 * retrieving the inventory details by SKU and inventory ID.
 *
 * The test ensures proper authorization by joining a customer first, creates
 * realistic inventory data, and validates the retrieved data matches the
 * created record with strict type assertions and business logic checks.
 *
 * Steps:
 *
 * 1. Customer joins the platform (authorization prerequisite).
 * 2. Customer creates an inventory record linked to a SKU.
 * 3. Inventory details are retrieved by SKU and inventory ID.
 * 4. Validate all inventory data fields are consistent and accurate.
 *
 * This validates both creation and retrieval lifecycle including security, data
 * integrity, and API contract fidelity.
 */
export async function test_api_shopping_mall_inventory_retrieval_by_sku_and_inventory_id(
  connection: api.IConnection,
) {
  // Step 1: Customer joins the platform
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    href: "https://example.com/signup",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorized = await api.functional.auth.customer.join(connection, {
    body: customerBody,
  });
  typia.assert(authorized);

  // Step 2: Create inventory for a product variant SKU
  const skuCode = RandomGenerator.alphaNumeric(12);
  const inventoryBody = {
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    reserved_quantity: 0,
    restock_date: null,
  } satisfies IShoppingMallInventory.ICreate;

  const createdInventory =
    await api.functional.shoppingMall.customer.shoppingMallProductVariants.shoppingMallInventories.create(
      connection,
      {
        skuCode,
        body: inventoryBody,
      },
    );
  typia.assert(createdInventory);

  // Step 3: Retrieve the created inventory details by SKU and inventory ID
  const retrievedInventory =
    await api.functional.shoppingMall.shoppingMallProductVariants.shoppingMallInventories.at(
      connection,
      {
        skuCode,
        shoppingMallInventoryId: createdInventory.id,
      },
    );
  typia.assert(retrievedInventory);

  // Step 4: Validate that retrieved inventory matches created inventory
  TestValidator.equals(
    "inventory id matches",
    retrievedInventory.id,
    createdInventory.id,
  );
  TestValidator.equals(
    "sku variant id matches",
    retrievedInventory.shopping_mall_product_variant_id,
    createdInventory.shopping_mall_product_variant_id,
  );
  TestValidator.equals(
    "quantity matches",
    retrievedInventory.quantity,
    createdInventory.quantity,
  );
  TestValidator.equals(
    "reserved quantity matches",
    retrievedInventory.reserved_quantity,
    createdInventory.reserved_quantity,
  );
  TestValidator.equals(
    "restock date matches",
    retrievedInventory.restock_date,
    createdInventory.restock_date,
  );
  TestValidator.equals(
    "created at matches",
    retrievedInventory.created_at,
    createdInventory.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    retrievedInventory.updated_at,
    createdInventory.updated_at,
  );
  TestValidator.equals(
    "deleted at matches",
    retrievedInventory.deleted_at,
    createdInventory.deleted_at ?? null,
  );
}
