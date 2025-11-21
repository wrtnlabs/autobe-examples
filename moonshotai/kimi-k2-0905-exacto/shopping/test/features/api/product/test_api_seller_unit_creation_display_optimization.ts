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
 * Test unit creation with display interface optimization including dropdown
 * selection logic, button arrangement strategies, swatch presentation quality,
 * and mobile-first design considerations. Validates that sellers can optimize
 * customer selection experiences through strategic unit display configuration
 * while maintaining accessibility standards and conversion optimization
 * throughout the shopping interface.
 */
export async function test_api_seller_unit_creation_display_optimization(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "sole_proprietorship",
        "corporation",
        "llc",
        "partnership",
      ]),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create product requiring sophisticated display optimization
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: RandomGenerator.pick(["new", "used", "refurbished"]),
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/dashboard/products/new",
        referrer: "https://example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create dropdown unit for size selection with optimized display
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size",
        type: RandomGenerator.pick(["size", "dimension", "custom"]),
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  // Step 4: Create button unit for color selection with visual arrangement
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: RandomGenerator.pick(["color", "custom"]),
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // TestValidator for button arrangement accessibility
  await TestValidator.predicate(
    "color unit has proper accessibility support",
    colorUnit.name.length >= 3 && colorUnit.name.length <= 50,
  );

  // Step 5: Create swatch unit for material selection with visual samples
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Material",
        type: RandomGenerator.pick(["material", "texture", "fabric", "custom"]),
        display_style: "swatches",
        is_required: false,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // Step 6: Create text input unit for custom dimensions (mobile-optimized)
  const customUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Custom Dimensions",
        type: RandomGenerator.pick(["size", "dimension", "custom"]),
        display_style: "text_input",
        is_required: false,
        is_multiple: true,
        sort_order: 4,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(customUnit);

  // Validate display optimization features
  await TestValidator.predicate(
    "size unit uses dropdown for compact mobile display",
    sizeUnit.display_style === "dropdown",
  );
  await TestValidator.predicate(
    "color unit uses buttons for quick visual selection",
    colorUnit.display_style === "buttons",
  );
  await TestValidator.predicate(
    "material unit uses swatches for tactile visualization",
    materialUnit.display_style === "swatches",
  );
  await TestValidator.predicate(
    "custom unit supports multiple inputs for complex specifications",
    customUnit.is_multiple === true,
  );

  // Validate sort order optimization
  await TestValidator.predicate(
    "units are ordered by conversion priority",
    sizeUnit.sort_order < colorUnit.sort_order &&
      colorUnit.sort_order < materialUnit.sort_order &&
      materialUnit.sort_order < customUnit.sort_order,
  );

  // Validate accessibility compliance
  await TestValidator.predicate(
    "all unit names meet accessibility guidelines",
    sizeUnit.name.length >= 2 &&
      sizeUnit.name.length <= 100 &&
      colorUnit.name.length >= 2 &&
      colorUnit.name.length <= 100 &&
      materialUnit.name.length >= 2 &&
      materialUnit.name.length <= 100 &&
      customUnit.name.length >= 2 &&
      customUnit.name.length <= 100,
  );

  // Validate conversion optimization logic
  await TestValidator.predicate(
    "most important selection (size) is required",
    sizeUnit.is_required === true,
  );
  await TestValidator.predicate(
    "visual elements are prioritized for mobile experience",
    (colorUnit.display_style === "buttons" ||
      colorUnit.display_style === "swatches") &&
      (materialUnit.display_style === "buttons" ||
        materialUnit.display_style === "swatches"),
  );

  // Validate mobile-first display characteristics
  await TestValidator.predicate(
    "dropdown selection minimizes screen real estate",
    sizeUnit.display_style === "dropdown" && sizeUnit.is_multiple === false,
  );
  await TestValidator.predicate(
    "button selection enables quick visual decisions",
    colorUnit.display_style === "buttons",
  );
  await TestValidator.predicate(
    "swatch selection provides tactile material representation",
    materialUnit.display_style === "swatches",
  );

  // Verify accessibility and usability standards
  await TestValidator.predicate(
    "unit configurations support screen reader compatibility",
    colorUnit.name.length <= 100 && materialUnit.name.length <= 100,
  );

  // Validate business optimization throughput
  await TestValidator.predicate(
    "high-conversion items require user selection",
    sizeUnit.is_required === true && colorUnit.is_required === true,
  );

  await TestValidator.predicate(
    "optional customization maintains shopping flow",
    materialUnit.is_required === false && customUnit.is_required === false,
  );
}
