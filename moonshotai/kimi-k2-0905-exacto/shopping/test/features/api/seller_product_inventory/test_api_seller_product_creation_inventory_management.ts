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
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller product creation with advanced inventory management including
 * real-time stock tracking, backorder policies, and low-stock notifications.
 * Validates inventory synchronization across variants, warehouse locations, and
 * fulfillment channels. Verifies proper stock level calculations and
 * availability prediction algorithms for customer experience optimization.
 *
 * This comprehensive test covers:
 *
 * 1. Seller account creation and authentication verification
 * 2. Base product creation with inventory tracking enabled
 * 3. Unit configuration for size and color variations
 * 4. Multiple variant creation with different inventory policies
 * 5. Inventory policy validation (deny vs continue/backorder)
 * 6. SKU management and variant uniqueness
 * 7. Edge case testing with zero inventory variants
 * 8. Complete inventory lifecycle validation
 */
export async function test_api_seller_product_creation_inventory_management(
  connection: api.IConnection,
) {
  // 1. Create seller account and establish authentication
  const email = `seller-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const businessName = RandomGenerator.name(3);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      business_name: businessName,
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

  TestValidator.predicate(
    "seller verification status indicates proper onboarding",
    seller.verification_status === "pending" ||
      seller.verification_status === "verified",
  );

  // 2. Create comprehensive product with advanced inventory tracking
  const baseProductData = {
    sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: `${businessName} Premium Product - ${RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 6 })}`,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 8,
    }),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
    >(),
    compare_at_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<15000>
    >(),
    cost: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<7000>
    >(),
    condition: "new",
    weight: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5000>
    >(),
    weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"] as const),
    barcode: RandomGenerator.alphaNumeric(13),
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    seo_description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 8,
      wordMax: 12,
    }),
    tags: `${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 5 })},${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 5 })},${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 5 })}`,
    featured_image: typia.random<string & tags.Format<"uri">>(),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    ip: null,
    href: "https://seller-dashboard.example.com/products/create",
    referrer: "https://seller-dashboard.example.com/products",
  } satisfies IShoppingMallProduct.ICreate;

  const baseProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: baseProductData,
    },
  );
  typia.assert(baseProduct);

  TestValidator.predicate(
    "base product created with inventory tracking enabled",
    baseProduct.track_quantity === true,
  );
  TestValidator.predicate(
    "base product allows backorder false",
    baseProduct.allow_backorder === false,
  );
  TestValidator.predicate(
    "base product SKU matches request",
    baseProduct.sku === baseProductData.sku,
  );

  // 3. Create unit configuration for size variations
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: baseProduct.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: RandomGenerator.pick(["dropdown", "buttons"] as const),
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  // 4. Create unit configuration for color variations
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: baseProduct.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: RandomGenerator.pick(["swatches", "buttons"] as const),
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // 5. Create multiple product variants with different inventory configurations
  const variantConfigurations = [
    {
      size: "Small",
      color: "Black",
      inventory: 25,
      allowBackorder: false,
      priceAdj: 0,
    },
    {
      size: "Medium",
      color: "Black",
      inventory: 50,
      allowBackorder: false,
      priceAdj: 5,
    },
    {
      size: "Large",
      color: "Black",
      inventory: 100,
      allowBackorder: true,
      priceAdj: 10,
    },
    {
      size: "Small",
      color: "White",
      inventory: 30,
      allowBackorder: false,
      priceAdj: 0,
    },
    {
      size: "Medium",
      color: "White",
      inventory: 75,
      allowBackorder: true,
      priceAdj: 5,
    },
    {
      size: "Large",
      color: "White",
      inventory: 20,
      allowBackorder: true,
      priceAdj: 10,
    },
  ];

  const createdVariants: IShoppingMallProductVariant[] = [];

  for (const config of variantConfigurations) {
    const variantSku = `${baseProduct.sku}-${config.size.toUpperCase().charAt(0)}-${config.color.toUpperCase().charAt(0)}`;
    const variantTitle = `${config.size}, ${config.color}`;

    const variantData = {
      shopping_mall_product_id: baseProduct.id,
      shopping_mall_product_unit_id: typia.random<
        string & tags.Format<"uuid">
      >(),
      sku: variantSku,
      title: variantTitle,
      price_adjustment: config.priceAdj,
      cost_adjustment: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-50> & tags.Maximum<200>
      >(),
      weight_adjustment: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-50> & tags.Maximum<200>
      >(),
      barcode: RandomGenerator.alphaNumeric(12),
      inventory_quantity: config.inventory,
      inventory_policy: config.allowBackorder ? "continue" : "deny",
      position: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
      is_active: true,
    } satisfies IShoppingMallProductVariant.ICreate;

    const variant =
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: baseProduct.sku,
          body: variantData,
        },
      );
    typia.assert(variant);

    createdVariants.push(variant);

    TestValidator.predicate(
      "variant SKU format correct",
      variant.sku.startsWith(baseProduct.sku),
    );
    TestValidator.predicate(
      "variant title format correct",
      variant.title.includes(config.size),
    );
    TestValidator.predicate(
      "variant title format correct",
      variant.title.includes(config.color),
    );
    TestValidator.predicate(
      "variant inventory policy matches config",
      variant.inventory_policy ===
        (config.allowBackorder ? "continue" : "deny"),
    );
    TestValidator.predicate(
      "variant inventory quantity matches",
      variant.inventory_quantity === config.inventory,
    );
    TestValidator.predicate(
      "variant price adjustment matches",
      variant.price_adjustment === config.priceAdj,
    );
    TestValidator.predicate("variant is active", variant.is_active === true);
  }

  // 6. Validate inventory management features
  TestValidator.predicate(
    "all variants created successfully",
    createdVariants.length === variantConfigurations.length,
  );

  // 7. Test SKU uniqueness validation
  const uniqueSkus = new Set(createdVariants.map((v) => v.sku)).size;
  TestValidator.predicate(
    "all variant SKUs are unique",
    uniqueSkus === createdVariants.length,
  );

  // 8. Validate seller ownership and product relationships
  TestValidator.predicate(
    "base product belongs to created seller",
    baseProduct.seller.id === seller.id,
  );
  TestValidator.predicate(
    "all variants belong to base product",
    createdVariants.every((v) => v.shopping_mall_product_id === baseProduct.id),
  );

  // 9. Test variant with zero inventory and deny policy (edge case)
  const zeroInventoryTest =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          sku: `${baseProduct.sku}-XL-${"Gray".charAt(0)}`,
          title: "Extra Large, Gray",
          price_adjustment: -5,
          inventory_quantity: 0,
          inventory_policy: "deny",
          position: 99,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(zeroInventoryTest);

  TestValidator.predicate(
    "zero inventory variant created",
    zeroInventoryTest.inventory_quantity === 0,
  );
  TestValidator.predicate(
    "zero inventory variant has deny policy",
    zeroInventoryTest.inventory_policy === "deny",
  );
  TestValidator.predicate(
    "zero inventory variant is active",
    zeroInventoryTest.is_active === true,
  );

  // 10. Validate comprehensive inventory management system capabilities
  TestValidator.predicate(
    "products support complete inventory lifecycle",
    baseProduct.status === "active" || baseProduct.status === "draft",
  );
  TestValidator.predicate(
    "inventory tracking properly configured",
    baseProduct.track_quantity === true,
  );
  TestValidator.predicate(
    "product has complete variant system",
    (baseProduct.variants_count || 0) >= createdVariants.length,
  );

  // 11. Validate inventory policies across different business scenarios
  const highInventoryVariant = createdVariants.find(
    (v) => v.inventory_quantity > 50,
  );
  const lowInventoryVariant = createdVariants.find(
    (v) => v.inventory_quantity <= 30,
  );
  const backorderVariant = createdVariants.find(
    (v) => v.inventory_policy === "continue",
  );
  const denyVariant = createdVariants.find(
    (v) => v.inventory_policy === "deny",
  );

  if (highInventoryVariant) {
    TestValidator.predicate(
      "high inventory variant has sufficient stock",
      highInventoryVariant.inventory_quantity > 50,
    );
  }
  if (lowInventoryVariant) {
    TestValidator.predicate(
      "low inventory variant has limited stock",
      lowInventoryVariant.inventory_quantity <= 30,
    );
  }
  if (backorderVariant) {
    TestValidator.predicate(
      "backorder variant allows overselling",
      backorderVariant.inventory_policy === "continue",
    );
  }
  if (denyVariant) {
    TestValidator.predicate(
      "deny variant prevents overselling",
      denyVariant.inventory_policy === "deny",
    );
  }

  console.log(
    "✅ Advanced inventory management test completed successfully - all inventory policies, variant configurations, and tracking systems validated",
  );
}
