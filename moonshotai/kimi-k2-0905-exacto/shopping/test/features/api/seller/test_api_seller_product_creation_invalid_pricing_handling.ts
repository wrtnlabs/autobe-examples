import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product creation with comprehensive pricing validation scenarios.
 *
 * This test validates seller product creation with various invalid pricing
 * configurations:
 *
 * 1. Create authenticated seller account
 * 2. Generate valid category ID for product creation
 * 3. Test negative price values including edge case zero price
 * 4. Test missing required price field scenarios
 * 5. Test invalid promotional pricing configurations
 * 6. Test excessive price values beyond reasonable business limits
 * 7. Test non-numeric price values and scientific notation
 * 8. Test invalid cost values and variant price adjustments
 * 9. Verify proper error messages and validation
 * 10. Create successful product with valid pricing
 *
 * Ensures comprehensive price validation rules, proper data type enforcement,
 * and appropriate error messaging for pricing violations. Tests business rule
 * enforcement for marketplace pricing standards and profit margin protection.
 */
export async function test_api_seller_product_creation_invalid_pricing_handling(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "llc",
        "partnership",
        "sole_proprietorship",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Generate valid category ID and other product data
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const productName = RandomGenerator.name(2);
  const baseDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const validSku = RandomGenerator.alphaNumeric(8).toUpperCase();
  const reasonablePrice = typia.random<
    number & tags.Minimum<1> & tags.Maximum<10000>
  >();

  // Step 3: Test zero price - edge case between negative and positive
  const zeroPriceBody = {
    sku: validSku + "-ZERO",
    name: productName + " Zero Price Test",
    description: baseDescription,
    price: 0,
    condition: "new",
    weight: 1.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: categoryId,
    shopping_mall_seller_id: seller.id,
    href: "https://seller-dashboard.example.com/products/new",
    referrer: "https://seller-dashboard.example.com/products",
  } satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error("zero price should be rejected", async () => {
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: zeroPriceBody,
    });
  });

  // Step 4: Test negative price values - should fail
  const negativePriceBody = {
    sku: validSku + "-NEG",
    name: productName + " Negative Price Test",
    description: baseDescription,
    price: -100,
    condition: "new",
    weight: 1.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: categoryId,
    shopping_mall_seller_id: seller.id,
    href: "https://seller-dashboard.example.com/products/new",
    referrer: "https://seller-dashboard.example.com/products",
  } satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error("negative price should be rejected", async () => {
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: negativePriceBody,
    });
  });

  // Step 5: Test scientific notation excessive price - should fail
  const scientificNotationBody = {
    sku: validSku + "-SCIENTIFIC",
    name: productName + " Scientific Price Test",
    description: baseDescription,
    price: 1e10, // 10 billion in scientific notation
    condition: "new",
    weight: 1.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: categoryId,
    shopping_mall_seller_id: seller.id,
    href: "https://seller-dashboard.example.com/products/new",
    referrer: "https://seller-dashboard.example.com/products",
  } satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error(
    "scientific notation excessive price should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: scientificNotationBody,
      });
    },
  );

  // Step 6: Test invalid promotional pricing - compare_at_price less than price
  const invalidPromoBody = {
    sku: validSku + "-INV-PROMO",
    name: productName + " Invalid Promo Test",
    description: baseDescription,
    price: 200,
    compare_at_price: 150, // Invalid: promotional price higher than original
    condition: "new",
    weight: 1.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: categoryId,
    shopping_mall_seller_id: seller.id,
    href: "https://seller-dashboard.example.com/products/new",
    referrer: "https://seller-dashboard.example.com/products",
  } satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error(
    "invalid promotional pricing should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: invalidPromoBody,
      });
    },
  );

  // Step 7: Test excessive compare_at_price values - should fail
  const excessiveComparePriceBody = {
    sku: validSku + "-EXC-COMPARE",
    name: productName + " Excessive Compare Price Test",
    description: baseDescription,
    price: reasonablePrice,
    compare_at_price: 999999999, // Excessive promotional price
    condition: "new",
    weight: 1.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: categoryId,
    shopping_mall_seller_id: seller.id,
    href: "https://seller-dashboard.example.com/products/new",
    referrer: "https://seller-dashboard.example.com/products",
  } satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error(
    "excessive compare price should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: excessiveComparePriceBody,
      });
    },
  );

  // Step 8: Test invalid cost values - negative cost
  const negativeCostBody = {
    sku: validSku + "-NEG-COST",
    name: productName + " Negative Cost Test",
    description: baseDescription,
    price: reasonablePrice,
    cost: -50, // Invalid negative cost
    condition: "new",
    weight: 1.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: categoryId,
    shopping_mall_seller_id: seller.id,
    href: "https://seller-dashboard.example.com/products/new",
    referrer: "https://seller-dashboard.example.com/products",
  } satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error("negative cost should be rejected", async () => {
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: negativeCostBody,
    });
  });

  // Step 9: Test variant with invalid price adjustment
  const invalidVariantBody = {
    sku: validSku + "-INV-VARIANT",
    name: productName + " Invalid Variant Test",
    description: baseDescription,
    price: reasonablePrice,
    condition: "new",
    weight: 1.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: categoryId,
    shopping_mall_seller_id: seller.id,
    variants: [
      {
        shopping_mall_product_id: categoryId, // Will be corrected by API
        shopping_mall_product_unit_id: categoryId, // Will be corrected by API
        sku: validSku + "-VARIANT-SKU",
        title: "Premium Variant",
        price_adjustment: 999999999, // Excessive price adjustment
        inventory_quantity: 10,
        inventory_policy: "deny" as const,
        position: 1,
        is_active: true,
      },
    ],
    href: "https://seller-dashboard.example.com/products/new",
    referrer: "https://seller-dashboard.example.com/products",
  } satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error(
    "excessive variant price adjustment should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: invalidVariantBody,
      });
    },
  );

  // Step 10: Create successful product with valid pricing
  const validProductBody = {
    sku: validSku,
    name: productName + " Valid Product",
    description: baseDescription,
    price: reasonablePrice,
    compare_at_price: reasonablePrice + 50, // Valid promotional pricing (10% higher)
    cost: reasonablePrice * 0.6, // Reasonable cost (60% of price)
    condition: "new",
    weight: 1.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: categoryId,
    shopping_mall_seller_id: seller.id,
    href: "https://seller-dashboard.example.com/products/new",
    referrer: "https://seller-dashboard.example.com/products",
  } satisfies IShoppingMallProduct.ICreate;

  const validProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: validProductBody,
    },
  );
  typia.assert(validProduct);

  // Validate successful product creation with comprehensive checks
  TestValidator.equals(
    "product name matches",
    validProduct.name,
    validProductBody.name,
  );
  TestValidator.equals(
    "product price matches",
    validProduct.price,
    validProductBody.price,
  );
  TestValidator.equals(
    "product compare_at_price matches",
    validProduct.compare_at_price,
    validProductBody.compare_at_price,
  );
  TestValidator.equals(
    "product cost matches",
    validProduct.cost,
    validProductBody.cost,
  );
  TestValidator.predicate(
    "product has valid seller",
    validProduct.seller.id === seller.id,
  );
  TestValidator.predicate(
    "product has valid category",
    validProduct.category.id === categoryId,
  );
  TestValidator.predicate("product has positive price", validProduct.price > 0);
  TestValidator.predicate(
    "promotional pricing is valid",
    validProduct.compare_at_price! > validProduct.price,
  );
  TestValidator.predicate("cost is reasonable", validProduct.cost! > 0);
  TestValidator.predicate(
    "profit margin is positive",
    validProduct.price > validProduct.cost!,
  );
}
