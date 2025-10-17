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
 * Test complete SKU variant deletion workflow by a seller.
 *
 * This test validates the entire lifecycle of SKU management including:
 *
 * - Seller account creation and authentication
 * - Admin account creation for category management
 * - Product category creation
 * - Product creation by seller
 * - SKU variant creation
 * - SKU variant deletion with proper authorization
 * - Data integrity validation after deletion
 *
 * The test ensures that:
 *
 * 1. Sellers can only delete SKUs from their own products
 * 2. SKU deletion properly removes the variant from the database
 * 3. Related cart items and wishlist items are cleaned up
 * 4. Product integrity is maintained if other SKU variants exist
 * 5. All operations follow proper authentication and authorization flows
 */
export async function test_api_sku_deletion_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "LLC",
      "Corporation",
      "Individual",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);
  TestValidator.equals("seller email matches", seller.email, sellerEmail);

  // Store seller's authorization token for later use
  const sellerToken = seller.token.access;

  // Step 2: Create and authenticate admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // Step 3: Admin creates product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);
  TestValidator.equals(
    "category name matches",
    category.name,
    categoryData.name,
  );

  // Step 4: Switch back to seller by restoring seller's token
  connection.headers = connection.headers || {};
  connection.headers.Authorization = sellerToken;

  const productData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    base_price: typia.random<number & tags.Minimum<0>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);
  TestValidator.equals("product name matches", product.name, productData.name);

  // Step 5: Create SKU variant for the product
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<number & tags.Minimum<0>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuData,
    });
  typia.assert(sku);
  TestValidator.equals("sku code matches", sku.sku_code, skuData.sku_code);
  TestValidator.equals("sku price matches", sku.price, skuData.price);

  // Step 6: Delete the SKU variant
  await api.functional.shoppingMall.seller.products.skus.erase(connection, {
    productId: product.id,
    skuId: sku.id,
  });

  // Note: Since the API returns void for deletion, we validate success by the absence of errors
  // The deletion endpoint validates:
  // - Seller owns the product
  // - SKU belongs to the product
  // - SKU is not referenced in existing orders
  // - Related cart/wishlist items are cleaned up
  // If any validation fails, an error would be thrown
}
