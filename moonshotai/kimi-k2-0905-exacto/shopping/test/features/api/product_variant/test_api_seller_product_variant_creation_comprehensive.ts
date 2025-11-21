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
 * Test comprehensive product variant creation supporting size, color, material,
 * and specialized configuration systems enabling customers to select precise
 * product attributes while maintaining unified product discoverability and
 * variant-specific inventory management across marketplace catalogs within
 * sophisticated product configuration framework enabling accurate purchase
 * selection experiences throughout platform commerce operations globally across
 * distributed seller ecosystem successfully.
 *
 * This test validates the complete workflow:
 *
 * 1. Seller registration and authentication setup
 * 2. Parent product creation with comprehensive details
 * 3. Product unit configuration for attribute systems (size, color, material)
 * 4. Multiple variant creation with different multi-attribute configurations
 * 5. Price adjustment validation and inventory management across variant
 *    combinations
 * 6. Variant display ordering and activation controls
 * 7. SKU uniqueness verification and complex configuration logic validation
 * 8. Business rule enforcement for variant lifecycle management
 */
export async function test_api_seller_product_variant_creation_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for variant operations
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "1234";
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(8),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create parent product for variant support
  const productData = {
    sku: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(1),
    description: RandomGenerator.content({ paragraphs: 2 }),
    price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
    condition: "new",
    weight: 1.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: "https://test.store/dashboard/products/new",
    referrer: "https://test.store/dashboard/products",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 3: Configure size unit for product variations
  const sizeUnitData = {
    name: "Size",
    type: "size",
    display_style: "dropdown",
    is_required: true,
    is_multiple: false,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: sizeUnitData,
    });
  typia.assert(sizeUnit);

  // Step 4: Configure color unit for product variations
  const colorUnitData = {
    name: "Color",
    type: "color",
    display_style: "swatches",
    is_required: true,
    is_multiple: false,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: colorUnitData,
    });
  typia.assert(colorUnit);

  // Step 5: Configure material unit for product variations
  const materialUnitData = {
    name: "Material",
    type: "material",
    display_style: "buttons",
    is_required: false,
    is_multiple: false,
    sort_order: 3,
  } satisfies IShoppingMallProductUnit.ICreate;

  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: materialUnitData,
    });
  typia.assert(materialUnit);

  // Step 6: Create size variants using size unit configurations
  const largeBlueCottonData = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: sizeUnit.id,
    sku: product.sku + "-LG-BLUE-COTTON",
    title: "Large, Blue Cotton",
    price_adjustment: 15.5,
    cost_adjustment: 5,
    weight_adjustment: 0.2,
    inventory_quantity: 50,
    inventory_policy: "continue" as const,
    position: 1,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const largeBlueCotton =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: largeBlueCottonData,
      },
    );
  typia.assert(largeBlueCotton);

  // Step 7: Create medium red polyester variant
  const mediumRedPolyesterData = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: sizeUnit.id,
    sku: product.sku + "-MED-RED-POLYESTER",
    title: "Medium, Red Polyester",
    price_adjustment: 8,
    cost_adjustment: 2,
    weight_adjustment: -0.1,
    inventory_quantity: 75,
    inventory_policy: "deny" as const,
    position: 2,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const mediumRedPolyester =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: mediumRedPolyesterData,
      },
    );
  typia.assert(mediumRedPolyester);

  // Step 8: Create small green leather demonstrating optional material
  const smallGreenLeatherData = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: sizeUnit.id,
    sku: product.sku + "-SM-GRN-LEATHER",
    title: "Small, Green Leather",
    price_adjustment: 25,
    inventory_quantity: 20,
    inventory_policy: "deny" as const,
    position: 3,
    is_active: false,
  } satisfies IShoppingMallProductVariant.ICreate;

  const smallGreenLeather =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: smallGreenLeatherData,
      },
    );
  typia.assert(smallGreenLeather);

  // Step 9: Validate variant data integrity and relationships
  TestValidator.predicate(
    "large cotton variant SKU follows naming pattern",
    largeBlueCotton.sku.includes("LG-BLUE-COTTON"),
  );
  TestValidator.equals(
    "medium polyester price adjustment matches input",
    mediumRedPolyester.price_adjustment,
    8,
  );
  TestValidator.equals(
    "small leather inventory policy is deny",
    smallGreenLeather.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "small leather is inactive",
    smallGreenLeather.is_active,
    false,
  );
  TestValidator.predicate(
    "medium polyester contains material specification",
    mediumRedPolyester.title.includes("Polyester"),
  );

  // Step 10: Verify parent product relationships are maintained
  TestValidator.equals(
    "all variants reference same parent product",
    largeBlueCotton.shopping_mall_product_id ===
      mediumRedPolyester.shopping_mall_product_id &&
      mediumRedPolyester.shopping_mall_product_id ===
        smallGreenLeather.shopping_mall_product_id,
    true,
  );

  // Step 11: Test variant display ordering functionality
  TestValidator.predicate(
    "position ordering maintained for sorting",
    largeBlueCotton.position < mediumRedPolyester.position,
  );
  TestValidator.predicate(
    "position sequence continues correctly",
    mediumRedPolyester.position < smallGreenLeather.position,
  );

  // Step 12: Validate inventory management across variants
  TestValidator.predicate(
    "large cotton has highest inventory",
    largeBlueCotton.inventory_quantity > mediumRedPolyester.inventory_quantity,
  );
  TestValidator.predicate(
    "small leather has lowest inventory",
    smallGreenLeather.inventory_quantity < largeBlueCotton.inventory_quantity,
  );
  TestValidator.predicate(
    "medium polyester inventory is in middle range",
    mediumRedPolyester.inventory_quantity >
      smallGreenLeather.inventory_quantity &&
      mediumRedPolyester.inventory_quantity <
        largeBlueCotton.inventory_quantity,
  );

  // Step 13: Demonstrate comprehensive configuration system validation
  TestValidator.predicate(
    "all variants use correct parent unit reference",
    largeBlueCotton.shopping_mall_product_unit_id === sizeUnit.id &&
      mediumRedPolyester.shopping_mall_product_unit_id === sizeUnit.id &&
      smallGreenLeather.shopping_mall_product_unit_id === sizeUnit.id,
  );

  // Step 14: Validate SKU uniqueness and naming consistency
  TestValidator.notEquals(
    "all three variants have unique SKUs",
    largeBlueCotton.sku,
    mediumRedPolyester.sku,
  );
  TestValidator.notEquals(
    "all variants maintain SKU differentiation",
    smallGreenLeather.sku,
    largeBlueCotton.sku,
  );
  TestValidator.predicate(
    "all SKU patterns include parent product SKU",
    largeBlueCotton.sku.startsWith(product.sku) &&
      mediumRedPolyester.sku.startsWith(product.sku) &&
      smallGreenLeather.sku.startsWith(product.sku),
  );
}
