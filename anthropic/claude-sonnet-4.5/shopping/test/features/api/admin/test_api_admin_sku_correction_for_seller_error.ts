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
 * Test administrator's ability to correct SKU information when sellers make
 * data entry errors.
 *
 * This test validates the complete admin SKU correction workflow:
 *
 * 1. Create admin account for platform oversight
 * 2. Create category infrastructure (required for products)
 * 3. Create seller account that will make data entry errors
 * 4. Seller creates product with valid information
 * 5. Seller creates SKU with incorrect pricing (simulating error)
 * 6. Admin corrects the SKU pricing using admin endpoint
 * 7. Validate corrections applied immediately
 * 8. Verify data integrity and proper authorization
 */
export async function test_api_admin_sku_correction_for_seller_error(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for platform oversight
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category as admin (required infrastructure)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account that will create product with errors
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
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

  // Step 4: Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: 100.0,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Seller creates SKU with incorrect pricing (simulating error)
  const incorrectPrice = 999.99;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: incorrectPrice,
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Verify SKU was created with incorrect price
  TestValidator.equals("sku has incorrect price", sku.price, incorrectPrice);

  // Step 6: Switch to admin account to correct the SKU error
  connection.headers ??= {};
  connection.headers.Authorization = admin.token.access;

  // Step 7: Admin corrects the SKU pricing
  const correctPrice = 49.99;
  const correctedSku =
    await api.functional.shoppingMall.admin.products.skus.update(connection, {
      productId: product.id,
      skuId: sku.id,
      body: {
        price: correctPrice,
      } satisfies IShoppingMallSku.IUpdate,
    });
  typia.assert(correctedSku);

  // Step 8: Validate corrections applied immediately
  TestValidator.equals("sku id matches", correctedSku.id, sku.id);
  TestValidator.equals(
    "sku code unchanged",
    correctedSku.sku_code,
    sku.sku_code,
  );
  TestValidator.equals(
    "price corrected by admin",
    correctedSku.price,
    correctPrice,
  );
  TestValidator.notEquals(
    "price changed from incorrect",
    correctedSku.price,
    incorrectPrice,
  );
}
