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
 * Test seller's ability to adjust SKU pricing strategies for market
 * competitiveness.
 *
 * This comprehensive test validates dynamic pricing management for product SKU
 * variants. The test simulates a complete product lifecycle including:
 *
 * 1. Admin and seller account setup
 * 2. Category and product creation
 * 3. Multiple SKU variant creation with initial pricing
 * 4. Implementation of various pricing strategies (premium, discount, uniform
 *    adjustment)
 * 5. Validation of immediate price updates and SKU pricing independence
 *
 * The test ensures sellers can effectively manage competitive pricing across
 * product variants while maintaining data integrity and real-time catalog
 * updates.
 */
export async function test_api_sku_pricing_strategy_adjustment(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account for product and SKU management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(),
        business_type: "corporation",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name()} St`,
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create base product with initial pricing
  const basePrice = 100;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: basePrice,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 5: Create multiple SKU variants with initial pricing
  const sku1InitialPrice = 120;
  const sku1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        price: sku1InitialPrice,
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku1);
  TestValidator.equals("SKU1 initial price", sku1.price, sku1InitialPrice);

  const sku2InitialPrice = 100;
  const sku2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        price: sku2InitialPrice,
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku2);
  TestValidator.equals("SKU2 initial price", sku2.price, sku2InitialPrice);

  const sku3InitialPrice = 90;
  const sku3: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        price: sku3InitialPrice,
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku3);
  TestValidator.equals("SKU3 initial price", sku3.price, sku3InitialPrice);

  // Step 6: Apply premium pricing strategy to popular variant (SKU1)
  const sku1PremiumPrice = 150;
  const updatedSku1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productId: product.id,
      skuId: sku1.id,
      body: {
        price: sku1PremiumPrice,
      } satisfies IShoppingMallSku.IUpdate,
    });
  typia.assert(updatedSku1);
  TestValidator.equals(
    "SKU1 premium pricing applied",
    updatedSku1.price,
    sku1PremiumPrice,
  );
  TestValidator.equals("SKU1 ID unchanged", updatedSku1.id, sku1.id);

  // Step 7: Apply discounted pricing strategy to slow-moving variant (SKU3)
  const sku3DiscountPrice = 65;
  const updatedSku3: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productId: product.id,
      skuId: sku3.id,
      body: {
        price: sku3DiscountPrice,
      } satisfies IShoppingMallSku.IUpdate,
    });
  typia.assert(updatedSku3);
  TestValidator.equals(
    "SKU3 discount pricing applied",
    updatedSku3.price,
    sku3DiscountPrice,
  );
  TestValidator.equals("SKU3 ID unchanged", updatedSku3.id, sku3.id);

  // Step 8: Apply uniform price adjustment to standard variant (SKU2)
  const sku2AdjustedPrice = 110;
  const updatedSku2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productId: product.id,
      skuId: sku2.id,
      body: {
        price: sku2AdjustedPrice,
      } satisfies IShoppingMallSku.IUpdate,
    });
  typia.assert(updatedSku2);
  TestValidator.equals(
    "SKU2 uniform adjustment applied",
    updatedSku2.price,
    sku2AdjustedPrice,
  );
  TestValidator.equals("SKU2 ID unchanged", updatedSku2.id, sku2.id);

  // Step 9: Verify pricing independence - each SKU maintains its own price
  TestValidator.notEquals(
    "SKU1 and SKU2 have independent pricing",
    updatedSku1.price,
    updatedSku2.price,
  );
  TestValidator.notEquals(
    "SKU2 and SKU3 have independent pricing",
    updatedSku2.price,
    updatedSku3.price,
  );
  TestValidator.notEquals(
    "SKU1 and SKU3 have independent pricing",
    updatedSku1.price,
    updatedSku3.price,
  );

  // Step 10: Verify all prices are different from initial values
  TestValidator.notEquals(
    "SKU1 price changed from initial",
    updatedSku1.price,
    sku1InitialPrice,
  );
  TestValidator.notEquals(
    "SKU2 price changed from initial",
    updatedSku2.price,
    sku2InitialPrice,
  );
  TestValidator.notEquals(
    "SKU3 price changed from initial",
    updatedSku3.price,
    sku3InitialPrice,
  );

  // Verify pricing strategy implementation success
  TestValidator.predicate(
    "Premium pricing exceeds standard pricing",
    updatedSku1.price > updatedSku2.price,
  );
  TestValidator.predicate(
    "Discount pricing below standard pricing",
    updatedSku3.price < updatedSku2.price,
  );
}
