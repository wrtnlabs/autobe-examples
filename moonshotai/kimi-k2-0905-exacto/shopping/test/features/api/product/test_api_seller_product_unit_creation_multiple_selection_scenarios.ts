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
 * Test product unit creation with multiple selection capabilities enabling
 * customers to choose multiple options within the same unit type. This scenario
 * validates multiple selection logic through unit creation and configuration
 * testing. Tests business rules around multiple selections and validates that
 * the system correctly handles units configured for multiple attribute
 * selection.
 */
export async function test_api_seller_product_unit_creation_multiple_selection_scenarios(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
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

  // Step 2: Create a product for testing multiple selection scenarios
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<5000>
        >(),
        condition: "new",
        weight: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"] as const),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        variants: [],
        images: [],
        seo_title: RandomGenerator.name(3),
        seo_description: RandomGenerator.paragraph({ sentences: 3 }),
        tags: "electronics,gadgets,tech",
        featured_image: null,
        compare_at_price: null,
        cost: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<2000>
        >(),
        barcode: RandomGenerator.alphaNumeric(12),
        href: "https://example-marketplace.com/products/new",
        referrer: "https://example-marketplace.com/seller/dashboard",
        ip: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create product unit with multiple selection enabled (Color unit)
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: false,
        is_multiple: true, // Enable multiple selection
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);
  TestValidator.equals(
    "color unit multiple selection enabled",
    colorUnit.is_multiple,
    true,
  );
  TestValidator.equals("color unit name", colorUnit.name, "Color");
  TestValidator.equals("color unit display style", colorUnit.type, "color");

  // Step 4: Create another product unit with multiple selection enabled (Material unit)
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "buttons",
        is_required: false,
        is_multiple: true, // Enable multiple selection
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);
  TestValidator.equals(
    "material unit multiple selection enabled",
    materialUnit.is_multiple,
    true,
  );
  TestValidator.equals("material unit name", materialUnit.name, "Material");
  TestValidator.equals(
    "material unit display style",
    materialUnit.type,
    "material",
  );

  // Step 5: Create product unit with single selection (Size unit - control test)
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false, // Single selection only
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);
  TestValidator.equals(
    "size unit single selection only",
    sizeUnit.is_multiple,
    false,
  );
  TestValidator.equals("size unit name", sizeUnit.name, "Size");

  // Step 6: Verify all units are properly associated with the product
  TestValidator.equals(
    "color unit product association",
    colorUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "material unit product association",
    materialUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "size unit product association",
    sizeUnit.product.id,
    product.id,
  );

  // Step 7: Test business logic - validate multiple selection vs single selection configurations
  TestValidator.predicate(
    "multiple selection enables complex product configurations",
    () => colorUnit.is_multiple && materialUnit.is_multiple,
  );

  TestValidator.predicate(
    "control test: single selection variant exists for comparison",
    () => !sizeUnit.is_multiple && sizeUnit.is_required,
  );

  // Step 8: Validate unit ordering and display preferences for multiple selection units
  TestValidator.equals(
    "units maintain sequential sort order",
    colorUnit.sort_order < materialUnit.sort_order,
    true,
  );
  TestValidator.equals(
    "units maintain sequential sort order",
    materialUnit.sort_order < sizeUnit.sort_order,
    true,
  );

  // Step 9: Test requirement vs optional configurations for multiple selection
  TestValidator.predicate(
    "optional multiple selection units created",
    () => !colorUnit.is_required && !materialUnit.is_required,
  );

  TestValidator.predicate(
    "required single selection unit for comparison",
    () => sizeUnit.is_required,
  );

  // Step 10: Validate comprehensive unit configuration diversity
  const allUnits = [colorUnit, materialUnit, sizeUnit];
  TestValidator.equals(
    "all units belong to same product",
    allUnits.every((unit) => unit.product.id === product.id),
    true,
  );

  TestValidator.predicate(
    "multiple selection units exist with different configurations",
    () => allUnits.filter((unit) => unit.is_multiple).length >= 2,
  );

  TestValidator.predicate(
    "product has mix of selection types",
    () =>
      allUnits.some((unit) => unit.is_multiple) &&
      allUnits.some((unit) => !unit.is_multiple),
  );

  // Step 11: Validate unit type diversity for multiple selection scenarios
  TestValidator.predicate(
    "multiple selection units have different types",
    () => colorUnit.type !== materialUnit.type,
  );

  TestValidator.predicate(
    "display styles vary for optimal UX",
    () =>
      colorUnit.display_style !== materialUnit.display_style &&
      materialUnit.display_style !== sizeUnit.display_style,
  );

  // Step 12: Test comprehensive multiple selection configuration validation
  TestValidator.equals(
    "multiple selection units support flexible customer choices",
    colorUnit.is_multiple &&
      materialUnit.is_multiple &&
      colorUnit.is_required === false &&
      materialUnit.is_required === false,
    true,
  );

  // Step 13: Validate business rules compliance for unit configuration
  TestValidator.predicate(
    "all units maintain proper product relationships",
    () => allUnits.every((unit) => unit.product.id === product.id),
  );

  TestValidator.predicate(
    "sort order maintains logical progression",
    () =>
      allUnits[0].sort_order < allUnits[1].sort_order &&
      allUnits[1].sort_order < allUnits[2].sort_order,
  );
}
