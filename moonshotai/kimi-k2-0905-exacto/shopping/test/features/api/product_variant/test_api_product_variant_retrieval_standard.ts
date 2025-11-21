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
 * Test standard product variant retrieval workflow for customer browsing.
 *
 * This comprehensive test validates the complete product variant system from
 * seller setup through customer retrieval. It ensures that customers can access
 * detailed variant information including pricing, inventory status, and display
 * properties.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a new seller account
 * 2. Create a product with detailed catalog information
 * 3. Configure product units to enable variant creation
 * 4. Create specific product variants with unique configurations
 * 5. Retrieve and validate variant details as a customer would
 * 6. Test error conditions including invalid and non-existent variants
 * 7. Verify all variant properties including price adjustments and inventory
 *
 * Ensures data integrity across the product-variant hierarchy and validates
 * proper customer-facing presentation of product configuration options.
 */
export async function test_api_product_variant_retrieval_standard(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate seller account
  const sellerEmail =
    "tech.outlet@example.com" + typia.random<string & tags.Format<"uuid">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: "Tech Outlet Electronics",
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile("010"),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });

  // Step 2: Create parent product with comprehensive details
  const productSKU = "LAPTOP-GAM-001-" + RandomGenerator.alphaNumeric(6);
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productSKU,
        name: "Gaming Laptop Pro",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 12,
          sentenceMax: 18,
          wordMin: 4,
          wordMax: 8,
        }),
        price: 1499.99,
        compare_at_price: 1799.99,
        cost: 1000.0,
        condition: "new",
        weight: 2.5,
        weight_unit: "kg",
        barcode: RandomGenerator.alphaNumeric(13),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: "Gaming Laptop Pro - High Performance Gaming",
        seo_description: RandomGenerator.paragraph({ sentences: 8 }),
        tags: "gaming,laptop,electronics,computer",
        featured_image: "https://cdn.example.com/products/laptop-main.jpg",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://shop.example.com/products",
        referrer: "https://seller-portal.example.com",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );

  // Verify product creation success
  TestValidator.equals("product main SKU matches", product.sku, productSKU);
  TestValidator.equals(
    "product name matches",
    product.name,
    "Gaming Laptop Pro",
  );
  TestValidator.equals("product price matches", product.price, 1499.99);

  // Step 3: Configure product units for variant generation
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSKU,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });

  const storageUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSKU,
      body: {
        name: "Storage",
        type: "custom",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });

  // Verify unit creation
  TestValidator.equals("color unit name matches", colorUnit.name, "Color");
  TestValidator.equals("storage unit type", storageUnit.type, "custom");

  // Step 4: Create product variants with specific configurations
  const redVariantSKU = productSKU + "-RED-1TB";
  const redVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: productSKU,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: redVariantSKU,
          title: "Red, 1TB Storage",
          price_adjustment: 100.0,
          cost_adjustment: 80.0,
          weight_adjustment: 0.1,
          barcode: RandomGenerator.alphaNumeric(13),
          image: "https://cdn.example.com/products/laptop-red.jpg",
          inventory_quantity: 15,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );

  const blueVariantSKU = productSKU + "-BLUE-512GB";
  const blueVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: productSKU,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: storageUnit.id,
          sku: blueVariantSKU,
          title: "Blue, 512GB Storage",
          price_adjustment: -50.0,
          cost_adjustment: -30.0,
          weight_adjustment: -0.05,
          barcode: RandomGenerator.alphaNumeric(13),
          image: "https://cdn.example.com/products/laptop-blue.jpg",
          inventory_quantity: 25,
          inventory_policy: "deny",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );

  // Step 5: Retrieve and validate variants as customer would
  const retrievedRedVariant =
    await api.functional.shoppingMall.products.variants.at(connection, {
      productCode: productSKU,
      variantCode: redVariantSKU,
    });

  const retrievedBlueVariant =
    await api.functional.shoppingMall.products.variants.at(connection, {
      productCode: productSKU,
      variantCode: blueVariantSKU,
    });

  // Step 6: Comprehensive variant validation
  // Validate Red variant properties
  TestValidator.equals(
    "red variant SKU integrity",
    retrievedRedVariant.sku,
    redVariantSKU,
  );
  TestValidator.equals(
    "red variant title matches",
    retrievedRedVariant.title,
    "Red, 1TB Storage",
  );
  TestValidator.equals(
    "red variant price adjustment",
    retrievedRedVariant.price_adjustment,
    100.0,
  );
  TestValidator.equals(
    "red variant cost adjustment",
    retrievedRedVariant.cost_adjustment,
    80.0,
  );
  TestValidator.equals(
    "red variant weight adjustment",
    retrievedRedVariant.weight_adjustment,
    0.1,
  );
  TestValidator.equals(
    "red variant inventory quantity",
    retrievedRedVariant.inventory_quantity,
    15,
  );
  TestValidator.equals(
    "red variant inventory policy",
    retrievedRedVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals("red variant position", retrievedRedVariant.position, 1);
  TestValidator.predicate(
    "red variant is active",
    retrievedRedVariant.is_active === true,
  );
  TestValidator.predicate(
    "red variant has image URL",
    retrievedRedVariant.image !== null &&
      retrievedRedVariant.image !== undefined,
  );

  // Validate Blue variant properties
  TestValidator.equals(
    "blue variant SKU integrity",
    retrievedBlueVariant.sku,
    blueVariantSKU,
  );
  TestValidator.equals(
    "blue variant title matches",
    retrievedBlueVariant.title,
    "Blue, 512GB Storage",
  );
  TestValidator.equals(
    "blue variant price adjustment",
    retrievedBlueVariant.price_adjustment,
    -50.0,
  );
  TestValidator.equals(
    "blue variant cost adjustment",
    retrievedBlueVariant.cost_adjustment,
    -30.0,
  );
  TestValidator.equals(
    "blue variant weight adjustment",
    retrievedBlueVariant.weight_adjustment,
    -0.05,
  );
  TestValidator.equals(
    "blue variant inventory quantity",
    retrievedBlueVariant.inventory_quantity,
    25,
  );
  TestValidator.equals(
    "blue variant inventory policy",
    retrievedBlueVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "blue variant position",
    retrievedBlueVariant.position,
    2,
  );
  TestValidator.predicate(
    "blue variant is active",
    retrievedBlueVariant.is_active === true,
  );
  TestValidator.predicate(
    "blue variant has image URL",
    retrievedBlueVariant.image !== null &&
      retrievedBlueVariant.image !== undefined,
  );

  // Validate parent relationships and hierarchy
  TestValidator.equals(
    "red variant parent product ID",
    retrievedRedVariant.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "blue variant parent product ID",
    retrievedBlueVariant.shopping_mall_product_id,
    product.id,
  );
  TestValidator.predicate(
    "both variants have same product ID",
    retrievedRedVariant.shopping_mall_product_id ===
      retrievedBlueVariant.shopping_mall_product_id,
  );

  // Validate timestamps and lifecycle
  TestValidator.predicate(
    "red variant has created_at",
    typia.is<string & tags.Format<"date-time">>(retrievedRedVariant.created_at),
  );
  TestValidator.predicate(
    "blue variant has updated_at",
    typia.is<string & tags.Format<"date-time">>(
      retrievedBlueVariant.updated_at,
    ),
  );
  TestValidator.predicate(
    "variants are not deleted",
    retrievedRedVariant.deleted_at === undefined &&
      retrievedBlueVariant.deleted_at === undefined,
  );

  // Step 7: Error handling validation
  await TestValidator.error(
    "non-existent variant code should fail",
    async () => {
      await api.functional.shoppingMall.products.variants.at(connection, {
        productCode: productSKU,
        variantCode: "INVALID-VARIANT-CODE",
      });
    },
  );

  await TestValidator.error(
    "non-existent product code should fail",
    async () => {
      await api.functional.shoppingMall.products.variants.at(connection, {
        productCode: "INVALID-PRODUCT-CODE",
        variantCode: redVariantSKU,
      });
    },
  );

  await TestValidator.error(
    "mismatched product and variant codes should fail",
    async () => {
      await api.functional.shoppingMall.products.variants.at(connection, {
        productCode: "RANDOM-PRODUCT-123",
        variantCode: redVariantSKU,
      });
    },
  );

  // Comprehensive assertion validation
  typia.assert(retrievedRedVariant);
  typia.assert(retrievedBlueVariant);
}
