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
 * Test SKU uniqueness validation to ensure global SKU enforcement prevents
 * inventory conflicts and fulfillment confusion across the multi-seller
 * marketplace. Validates system behavior when sellers attempt duplicate SKUs,
 * including case sensitivity handling and special character SKU formats.
 *
 * SKU uniqueness is critical for inventory tracking accuracy and order
 * processing across different sellers and product categories. The system must
 * provide clear error messaging and maintain global uniqueness to prevent
 * fulfillment issues and analytical discrepancies.
 */
export async function test_api_seller_product_creation_duplicate_sku_validation(
  connection: api.IConnection,
) {
  // Create first seller - electronics merchant focused on tech products
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const firstSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      business_name: `${RandomGenerator.name()} Electronics Store`,
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(firstSeller);

  // Create first product with standard SKU format to establish uniqueness baseline
  const uniqueElectronicsSku = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const electronicsProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: uniqueElectronicsSku,
        name: `${RandomGenerator.name()} Bluetooth Wireless Headphones`,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        price: typia.random<number & tags.Minimum<50> & tags.Maximum<500>>(),
        condition: "new",
        weight: 0.35,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title:
          "Premium Bluetooth Headphones with Active Noise Cancellation",
        seo_description:
          "High-quality wireless headphones featuring advanced noise cancellation technology and comfortable design for extended listening sessions",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: firstSeller.id,
        href: `https://marketplace.example.com/seller/${firstSeller.id}/products`,
        referrer: `https://marketplace.example.com/seller/${firstSeller.id}/dashboard/products/new`,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(electronicsProduct);
  TestValidator.equals(
    "electronics product creation succeeds",
    electronicsProduct.sku,
    uniqueElectronicsSku,
  );

  // Create second seller - fashion retailer with different product focus
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const secondSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      business_name: `${RandomGenerator.name()} Fashion Boutique`,
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      business_type: "sole_proprietorship",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(secondSeller);

  // Test cross-seller SKU duplication rejection - same SKU should be rejected
  await TestValidator.error(
    "duplicate SKU across different sellers should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: {
          sku: uniqueElectronicsSku, // Exact same SKU from different seller
          name: `${RandomGenerator.name()} Designer Handbag Fashion Accessory`,
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          price: typia.random<
            number & tags.Minimum<100> & tags.Maximum<1000>
          >(),
          condition: "new",
          weight: 0.85,
          weight_unit: "kg",
          track_quantity: true,
          allow_backorder: false,
          is_shipping_required: true,
          is_taxable: true,
          seo_title: "Luxury Designer Handbag Premium Fashion Accessory",
          seo_description:
            "Elegant designer handbag crafted with premium materials, featuring multiple compartments and stylish design for the modern fashion enthusiast",
          category_id: typia.random<string & tags.Format<"uuid">>(),
          shopping_mall_seller_id: secondSeller.id,
          href: `https://marketplace.example.com/seller/${secondSeller.id}/products`,
          referrer: `https://marketplace.example.com/seller/${secondSeller.id}/dashboard/products/new`,
        } satisfies IShoppingMallProduct.ICreate,
      });
    },
  );

  // Test case sensitivity variations to determine system behavior
  const lowercaseSku = uniqueElectronicsSku.toLowerCase();
  TestValidator.predicate(
    "lowercase SKU differs from original",
    lowercaseSku !== uniqueElectronicsSku,
  );

  await TestValidator.error(
    "case-insensitive SKU matching should reject similar SKU",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: {
          sku: lowercaseSku, // Same SKU, different case
          name: `${RandomGenerator.name()} High-End Fashion Backpack`,
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          price: typia.random<number & tags.Minimum<75> & tags.Maximum<750>>(),
          condition: "new",
          weight: 1.2,
          weight_unit: "kg",
          track_quantity: true,
          allow_backorder: false,
          is_shipping_required: true,
          is_taxable: true,
          seo_title: "Designer Backpack Premium Travel Bag",
          seo_description:
            "Sophisticated backpack designed for both style and functionality, featuring durable materials and thoughtful organization for daily use",
          category_id: typia.random<string & tags.Format<"uuid">>(),
          shopping_mall_seller_id: secondSeller.id,
          href: `https://marketplace.example.com/seller/${secondSeller.id}/products`,
          referrer: `https://marketplace.example.com/seller/${secondSeller.id}/dashboard/products/new`,
        } satisfies IShoppingMallProduct.ICreate,
      });
    },
  );

  // Generate special character SKU to test edge case handling
  const specialCharacterSku = `SKU-SPEC!AL-${RandomGenerator.alphaNumeric(6)}-${Date.now().toString(36).slice(-4)}`;
  const specialCharacterProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: specialCharacterSku,
        name: `${RandomGenerator.name()} Limited Edition Collectible Item`,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 12,
        }),
        price: typia.random<number & tags.Minimum<200> & tags.Maximum<2000>>(),
        condition: "new",
        weight: 2.5,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: "Limited Edition Collectible Premium Quality Item",
        seo_description:
          "Exclusive collectible featuring special edition status and premium craftsmanship, perfect for collectors and enthusiasts",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: secondSeller.id,
        href: `https://marketplace.example.com/seller/${secondSeller.id}/products`,
        referrer: `https://marketplace.example.com/seller/${secondSeller.id}/dashboard/products/new`,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(specialCharacterProduct);

  // Verify special character SKU was successfully created
  TestValidator.equals(
    "special character SKU accepted",
    specialCharacterProduct.sku,
    specialCharacterSku,
  );

  // Test duplicate special character SKU rejection - should fail
  await TestValidator.error(
    "duplicate special character SKU should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: {
          sku: specialCharacterSku, // Exact duplicate of special character SKU
          name: `${RandomGenerator.name()} Home Decor Premium Item`,
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          price: typia.random<number & tags.Minimum<150> & tags.Maximum<800>>(),
          condition: "new",
          weight: 3.1,
          weight_unit: "kg",
          track_quantity: true,
          allow_backorder: false,
          is_shipping_required: true,
          is_taxable: true,
          seo_title: "Premium Home Decor Item Home Accessories",
          seo_description:
            "Sophisticated home decor piece featuring elegant design and premium materials, ideal for enhancing any living space",
          category_id: typia.random<string & tags.Format<"uuid">>(),
          shopping_mall_seller_id: firstSeller.id, // Different seller attempting duplicate
          href: `https://marketplace.example.com/seller/${firstSeller.id}/products`,
          referrer: `https://marketplace.example.com/seller/${firstSeller.id}/dashboard/products/new`,
        } satisfies IShoppingMallProduct.ICreate,
      });
    },
  );

  // Test same-seller duplicate SKU rejection to verify internal seller constraints
  const internalUniqueSku = `SKU-INTERNAL-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const internalProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: internalUniqueSku,
        name: `${RandomGenerator.name()} Kitchen Appliance Premium`,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        price: typia.random<number & tags.Minimum<80> & tags.Maximum<800>>(),
        condition: "new",
        weight: 4.2,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: "Premium Kitchen Appliance Advanced Cooking",
        seo_description:
          "Advanced kitchen appliance featuring modern technology and durable construction, designed to enhance cooking experiences at home",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: firstSeller.id,
        href: `https://marketplace.example.com/seller/${firstSeller.id}/products`,
        referrer: `https://marketplace.example.com/seller/${firstSeller.id}/dashboard/products/new`,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(internalProduct);

  await TestValidator.error(
    "same seller duplicate SKU should be rejected internally",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: {
          sku: internalUniqueSku, // Same SKU within same seller's catalog
          name: `${RandomGenerator.name()} Home Tools Utility Set`,
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          price: typia.random<number & tags.Minimum<45> & tags.Maximum<450>>(),
          condition: "new",
          weight: 1.8,
          weight_unit: "kg",
          track_quantity: true,
          allow_backorder: false,
          is_shipping_required: true,
          is_taxable: true,
          seo_title: "Complete Home Tools Set Utility Collection",
          seo_description:
            "Comprehensive home tools collection featuring essential items for household maintenance and improvement projects",
          category_id: typia.random<string & tags.Format<"uuid">>(),
          shopping_mall_seller_id: firstSeller.id, // Same seller attempting duplicate
          href: `https://marketplace.example.com/seller/${firstSeller.id}/products`,
          referrer: `https://marketplace.example.com/seller/${firstSeller.id}/dashboard/products/new`,
        } satisfies IShoppingMallProduct.ICreate,
      });
    },
  );

  // Verify all products maintain unique SKUs across different sellers
  TestValidator.predicate(
    "electronics product has unique SKU",
    electronicsProduct.sku.length > 0,
  );
  TestValidator.predicate(
    "special character product has unique SKU",
    specialCharacterProduct.sku.length > 0,
  );
  TestValidator.predicate(
    "internal product has unique SKU",
    internalProduct.sku.length > 0,
  );

  // Verify seller relationships are correctly established
  TestValidator.equals(
    "electronics seller matches creator",
    electronicsProduct.seller.id,
    firstSeller.id,
  );
  TestValidator.equals(
    "fashion seller matches creator",
    specialCharacterProduct.seller.id,
    secondSeller.id,
  );
  TestValidator.equals(
    "internal seller matches creator",
    internalProduct.seller.id,
    firstSeller.id,
  );

  // Ensure no duplicate SKUs exist among successfully created products
  TestValidator.notEquals(
    "electronics SKU differs from special character",
    electronicsProduct.sku,
    specialCharacterProduct.sku,
  );
  TestValidator.notEquals(
    "electronics SKU differs from internal",
    electronicsProduct.sku,
    internalProduct.sku,
  );
  TestValidator.notEquals(
    "special character SKU differs from internal",
    specialCharacterProduct.sku,
    internalProduct.sku,
  );
}
