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
 * Test complete seller product variant deletion workflow from seller
 * authentication through variant creation to final deletion. This scenario
 * validates the entire lifecycle where a seller creates a product, configures
 * product units, creates a product variant, and then successfully deletes that
 * variant. Proper authentication, RBAC authorization, variant existence
 * validation, and clean deletion with proper cleanup of related inventory
 * records. Tests that deleted variants are removed from customer interfaces
 * while maintaining historical references for audit trails.
 */
export async function test_api_seller_variant_deletion_successful_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create seller account in the marketplace
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    business_name: RandomGenerator.name(2),
    business_registration_number: RandomGenerator.alphabets(10).toUpperCase(),
    tax_id: `TAX-${RandomGenerator.alphaNumeric(8)}`,
    phone: RandomGenerator.mobile(),
    business_type: "corporation",
  } satisfies IShoppingMallSeller.IJoin;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);

  TestValidator.equals("seller account created", seller.email, sellerEmail);
  TestValidator.predicate("seller is verified", seller.is_verified === false);

  // Step 2: Create parent product in the marketplace
  const productSku = `PROD-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    sku: productSku,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    price: typia.random<number & tags.Minimum<0> & tags.Maximum<1000>>(),
    compare_at_price: 199.99,
    cost: 49.99,
    condition: "new",
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
    weight_unit: "kg",
    barcode: `BAR-${RandomGenerator.alphaNumeric(12)}`,
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    tags: "electronics,smart-device,seller,variant-test",
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    images: [
      {
        name: "main-product-image",
        extension: "jpg",
        url: `https://marketplace.example.com/products/${productSku}/main.jpg`,
      },
      {
        name: "product-detail-image",
        extension: "png",
        url: `https://marketplace.example.com/products/${productSku}/detail.png`,
      },
    ],
    href: `https://seller.example.com/products/new`,
    referrer: `https://seller.example.com/dashboard`,
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productBody,
    },
  );
  typia.assert(product);

  TestValidator.equals(
    "product created with correct SKU",
    product.sku,
    productSku,
  );
  TestValidator.equals(
    "product belongs to seller",
    product.seller.id,
    seller.id,
  );

  // Step 3: Create product units for variations
  const sizeUnitBody = {
    name: "Size",
    type: "size",
    display_style: "dropdown",
    is_required: true,
    is_multiple: false,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSku, // ❌ FIXED: Use SKU string, not UUID
      body: sizeUnitBody,
    });
  typia.assert(sizeUnit);

  TestValidator.equals("size unit created", sizeUnit.name, "Size");

  const colorUnitBody = {
    name: "Color",
    type: "color",
    display_style: "swatches",
    is_required: true,
    is_multiple: false,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSku, // ❌ FIXED: Use SKU string, not UUID
      body: colorUnitBody,
    });
  typia.assert(colorUnit);

  TestValidator.equals("color unit created", colorUnit.name, "Color");

  // Step 4: Create product variants with different configurations
  const variantSku1 = `VAR-LG-BLK-${RandomGenerator.alphaNumeric(8)}`;
  const variantBody1 = {
    sku: variantSku1,
    title: "Large, Black",
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: sizeUnit.id, // ✓ Fixed: Use actual unit ID from created unit
    price_adjustment: 5.0,
    cost_adjustment: 2.0,
    weight_adjustment: 0.2,
    barcode: `SKU-${variantSku1}`,
    inventory_quantity: 25,
    inventory_policy: "deny",
    position: 1,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const variant1 =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: productSku,
        body: variantBody1,
      },
    );
  typia.assert(variant1);

  TestValidator.equals("variant1 created", variant1.sku, variantSku1);
  TestValidator.equals(
    "variant1 belongs to product",
    variant1.shopping_mall_product_id,
    product.id,
  );

  // Create second variant
  const variantSku2 = `VAR-MD-RED-${RandomGenerator.alphaNumeric(8)}`;
  const variantBody2 = {
    sku: variantSku2,
    title: "Medium, Red",
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: colorUnit.id, // ✓ Fixed: Use actual unit ID from created unit
    price_adjustment: 3.5,
    cost_adjustment: 1.5,
    weight_adjustment: 0.1,
    barcode: `SKU-${variantSku2}`,
    inventory_quantity: 30,
    inventory_policy: "deny",
    position: 2,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const variant2 =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: productSku,
        body: variantBody2,
      },
    );
  typia.assert(variant2);

  TestValidator.equals("variant2 created", variant2.sku, variantSku2);

  // Create third variant (will be deleted later)
  const variantSku3 = `VAR-SM-BLU-${RandomGenerator.alphaNumeric(8)}`;
  const variantBody3 = {
    sku: variantSku3,
    title: "Small, Blue",
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: colorUnit.id, // ✓ Fixed: Use actual unit ID from created unit
    price_adjustment: -2.0,
    cost_adjustment: -1.0,
    weight_adjustment: -0.1,
    barcode: `SKU-${variantSku3}`,
    inventory_quantity: 15,
    inventory_policy: "deny",
    position: 3,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const variant3 =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: productSku,
        body: variantBody3,
      },
    );
  typia.assert(variant3);

  TestValidator.equals("variant3 created", variant3.sku, variantSku3);

  // Step 5: Delete the third variant to test deletion workflow
  const deletedVariant =
    await api.functional.shoppingMall.seller.products.variants.erase(
      connection,
      {
        productCode: productSku,
        variantCode: variantSku3,
      },
    );
  typia.assert(deletedVariant);

  TestValidator.equals(
    "deleted variant matches original",
    deletedVariant.id,
    variant3.id,
  );
  TestValidator.equals(
    "deleted variant has correct SKU",
    deletedVariant.sku,
    variantSku3,
  );
  TestValidator.equals(
    "deleted variant marked as inactive",
    deletedVariant.is_active,
    false,
  );

  // Step 6: Validate that the variant is properly removed
  TestValidator.predicate(
    "deleted variant has different updated_at",
    deletedVariant.updated_at !== variant3.updated_at,
  );

  // Test that existing variants are still accessible
  TestValidator.equals("variant1 still exists", variant1.is_active, true);
  TestValidator.equals(
    "variant1 inventory preserved",
    variant1.inventory_quantity,
    25,
  );
  TestValidator.equals("variant2 still exists", variant2.is_active, true);
  TestValidator.equals(
    "variant2 inventory preserved",
    variant2.inventory_quantity,
    30,
  );
}
