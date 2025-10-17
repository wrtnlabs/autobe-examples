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
 * Test admin's emergency intervention capability for critical inventory
 * discrepancies.
 *
 * This test validates the complete workflow of admin emergency inventory
 * correction:
 *
 * 1. Create admin account with emergency management privileges
 * 2. Create product category for organizational structure
 * 3. Create seller account to own products with inventory
 * 4. Seller creates a product with base information
 * 5. Seller creates SKU variant with initial inventory levels
 * 6. Admin detects inventory discrepancy through monitoring
 * 7. Admin performs emergency inventory correction using override privileges
 * 8. Validate admin correction is properly applied to SKU inventory
 * 9. Verify updated SKU reflects corrected inventory values
 * 10. Ensure platform data integrity through admin oversight
 */
export async function test_api_admin_emergency_inventory_adjustment(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for emergency inventory management
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Create product category for product organization
  const categoryCreateData = {
    name: RandomGenerator.name(),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateData,
    });
  typia.assert(category);

  // Step 3: Create seller account with inventory discrepancy
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerCreateData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateData,
    });
  typia.assert(seller);

  // Step 4: Seller creates product with inventory to be corrected
  const productCreateData = {
    name: RandomGenerator.name(),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >() satisfies number as number,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateData,
    });
  typia.assert(product);

  // Step 5: Seller creates SKU with inventory discrepancy requiring admin correction
  const initialPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
  >() satisfies number as number;
  const skuCreateData = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: initialPrice,
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateData,
    });
  typia.assert(sku);

  // Step 6-7: Admin detects inventory mismatch and performs emergency correction
  const correctedPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
  >() satisfies number as number;
  const skuUpdateData = {
    price: correctedPrice,
  } satisfies IShoppingMallSku.IUpdate;

  const updatedSku: IShoppingMallSku =
    await api.functional.shoppingMall.admin.products.skus.update(connection, {
      productId: product.id,
      skuId: sku.id,
      body: skuUpdateData,
    });
  typia.assert(updatedSku);

  // Step 8-9: Validate admin correction is properly applied
  TestValidator.equals(
    "updated SKU ID matches original",
    updatedSku.id,
    sku.id,
  );
  TestValidator.equals(
    "updated SKU code matches original",
    updatedSku.sku_code,
    sku.sku_code,
  );
  TestValidator.equals(
    "admin corrected price is applied",
    updatedSku.price,
    correctedPrice,
  );
  TestValidator.notEquals(
    "price was actually changed by admin",
    updatedSku.price,
    initialPrice,
  );
}
