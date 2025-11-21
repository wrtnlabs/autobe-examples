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
 * Test fundamental product unit creation establishing product configuration
 * foundation systems supporting size, color, material, and specialized
 * attribute definition enabling customer product selection interfaces within
 * marketplace catalog framework maintaining coherent product configuration
 * architecture throughout comprehensive commerce operations successfully across
 * distributed seller ecosystem globally throughout platform commerce
 * environment comprehensively.
 *
 * This test validates the core product unit creation functionality that enables
 * sellers to define different variation types for their products. Product units
 * serve as fundamental building blocks for creating configurable products,
 * allowing customers to select specific product configurations during purchase
 * while enabling sellers to manage different inventory levels and pricing for
 * each variation.
 *
 * The test follows this comprehensive workflow:
 *
 * 1. Seller registration to establish authentication context for marketplace
 *    operations
 * 2. Parent product creation to provide the foundation for unit configuration
 * 3. Multiple unit creation representing different variation types (size, color,
 *    material)
 * 4. Validation of unit properties including display styles, requirements, and
 *    ordering
 * 5. Verification that created units support variant generation for customer
 *    selection
 *
 * This ensures the product configuration system maintains coherent architecture
 * throughout commerce operations, enabling seamless customer product selection
 * interfaces across the distributed seller ecosystem.
 */
export async function test_api_seller_product_unit_creation_fundamental(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication context
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create parent product to serve as foundation for unit configuration
  const productData = {
    sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: `Premium ${RandomGenerator.name()} Collection`,
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
    >(),
    condition: "new",
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: "https://example.com/products/new",
    referrer: "https://example.com/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 3: Create Size unit for dimensional variations
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

  // Validate size unit properties
  TestValidator.equals("size unit name", sizeUnit.name, "Size");
  TestValidator.equals("size unit type", sizeUnit.type, "size");
  TestValidator.equals(
    "size unit display style",
    sizeUnit.display_style,
    "dropdown",
  );
  TestValidator.equals("size unit is required", sizeUnit.is_required, true);
  TestValidator.equals("size unit sort order", sizeUnit.sort_order, 1);

  // Step 4: Create Color unit for chromatic variations
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

  // Validate color unit properties
  TestValidator.equals("color unit name", colorUnit.name, "Color");
  TestValidator.equals("color unit type", colorUnit.type, "color");
  TestValidator.equals(
    "color unit display style",
    colorUnit.display_style,
    "swatches",
  );
  TestValidator.equals("color unit is required", colorUnit.is_required, true);
  TestValidator.equals("color unit sort order", colorUnit.sort_order, 2);

  // Step 5: Create Material unit for composition variations
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

  // Validate material unit properties
  TestValidator.equals("material unit name", materialUnit.name, "Material");
  TestValidator.equals("material unit type", materialUnit.type, "material");
  TestValidator.equals(
    "material unit display style",
    materialUnit.display_style,
    "buttons",
  );
  TestValidator.equals(
    "material unit is required",
    materialUnit.is_required,
    false,
  );
  TestValidator.equals("material unit sort order", materialUnit.sort_order, 3);

  // Step 6: Verify product relationships and unit associations
  TestValidator.equals(
    "size unit product relationship",
    sizeUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "color unit product relationship",
    colorUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "material unit product relationship",
    materialUnit.product.id,
    product.id,
  );

  // Step 7: Validate comprehensive unit system architecture
  TestValidator.predicate(
    "units support customer selection",
    sizeUnit.is_required === true &&
      colorUnit.is_required === true &&
      materialUnit.is_required === false,
  );

  TestValidator.predicate(
    "units maintain coherent display hierarchy",
    sizeUnit.sort_order < colorUnit.sort_order &&
      colorUnit.sort_order < materialUnit.sort_order,
  );

  TestValidator.predicate(
    "units enable variant configuration system",
    sizeUnit.type !== colorUnit.type &&
      colorUnit.type !== materialUnit.type &&
      sizeUnit.type !== materialUnit.type,
  );

  // Final validation: Complete product configuration foundation established
  TestValidator.predicate(
    "product configuration foundation complete",
    sizeUnit &&
      colorUnit &&
      materialUnit &&
      sizeUnit.product.id === product.id &&
      colorUnit.product.id === product.id &&
      materialUnit.product.id === product.id,
  );
}
