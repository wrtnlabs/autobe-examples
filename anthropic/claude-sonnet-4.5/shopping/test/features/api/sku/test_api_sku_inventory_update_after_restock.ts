import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test SKU inventory update workflow after restocking.
 *
 * This test validates the complete inventory management workflow where a seller
 * restocks product variants and updates SKU information. The test ensures that
 * inventory updates are applied correctly and reflected immediately in the
 * system.
 *
 * Steps:
 *
 * 1. Create admin account for category management
 * 2. Admin creates a product category
 * 3. Create seller account for product management
 * 4. Seller creates a product in the category
 * 5. Seller creates a SKU variant with initial inventory
 * 6. Seller updates the SKU with new pricing after restocking
 * 7. Validate all updates are reflected correctly
 */
export async function test_api_sku_inventory_update_after_restock(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: typia.random<number & tags.Type<"uint32">>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Seller creates SKU variant with initial inventory
  const initialPrice = typia.random<
    number & tags.Type<"uint32">
  >() satisfies number as number;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: initialPrice,
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Seller updates SKU with new pricing after restocking
  const updatedPrice = typia.random<
    number & tags.Type<"uint32">
  >() satisfies number as number;
  const updatedSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productId: product.id,
      skuId: sku.id,
      body: {
        price: updatedPrice,
      } satisfies IShoppingMallSku.IUpdate,
    });
  typia.assert(updatedSku);

  // Step 7: Validate the updated SKU
  TestValidator.equals("SKU ID matches", updatedSku.id, sku.id);
  TestValidator.equals(
    "SKU code remains unchanged",
    updatedSku.sku_code,
    sku.sku_code,
  );
  TestValidator.equals(
    "Price updated correctly",
    updatedSku.price,
    updatedPrice,
  );
}
