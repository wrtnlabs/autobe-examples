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
 * Test seller creation of product units with visual selection interfaces
 * including color swatches, texture samples, pattern previews, and image-based
 * options for enhanced customer experience.
 *
 * This comprehensive test validates visual interface configuration, image
 * integration, customer engagement optimization, and selection accuracy through
 * intuitive visual presentation supporting products where appearance is the
 * primary differentiating factor for purchase decisions.
 */
export async function test_api_seller_unit_creation_visual_selection(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for visual unit creation testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: `REG-${RandomGenerator.alphaNumeric(8)}`,
      tax_id: `TAX-${RandomGenerator.alphaNumeric(10)}`,
      phone: RandomGenerator.mobile("010"),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create visual products supporting color swatch and texture options
  // Create a fashion product that heavily relies on visual selection
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `SKU-VIS-${RandomGenerator.alphaNumeric(8)}`,
        name: "Premium Designer Jacket",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<1000>
        >(),
        condition: "new",
        weight: 1.2,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        featured_image: `https://example.com/images/${RandomGenerator.alphaNumeric(12)}.jpg`,
        tags: "fashion, jacket, designer, premium",
        href: "https://example.com/seller/products/create",
        referrer: "https://example.com/seller/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Configure visual product units for color swatches and texture selections

  // Create Color unit with swatch display for visual color selection
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // Create Material/Texture unit with visual texture samples
  const textureUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(textureUnit);

  // Create Pattern unit with image-based preview options
  const patternUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Pattern",
        type: "custom",
        display_style: "buttons",
        is_required: false,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(patternUnit);

  // Create Size unit with traditional dropdown for comparison
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 4,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  // Step 4: Validate visual interface configuration
  TestValidator.equals(
    "color unit type should be color",
    colorUnit.type,
    "color",
  );
  TestValidator.equals(
    "color unit display style should be swatches for visual selection",
    colorUnit.display_style,
    "swatches",
  );
  TestValidator.predicate(
    "color unit should be required for purchase",
    colorUnit.is_required === true,
  );

  TestValidator.equals(
    "texture unit type should be material",
    textureUnit.type,
    "material",
  );
  TestValidator.equals(
    "texture unit display style should be swatches for texture samples",
    textureUnit.display_style,
    "swatches",
  );
  TestValidator.predicate(
    "texture unit should be required for purchase",
    textureUnit.is_required === true,
  );

  TestValidator.equals(
    "pattern unit type should be custom",
    patternUnit.type,
    "custom",
  );
  TestValidator.equals(
    "pattern unit display style should be buttons for pattern preview",
    patternUnit.display_style,
    "buttons",
  );
  TestValidator.predicate(
    "pattern unit should be optional for customer choice",
    patternUnit.is_required === false,
  );

  TestValidator.equals("size unit type should be size", sizeUnit.type, "size");
  TestValidator.equals(
    "size unit display style should be dropdown for traditional selection",
    sizeUnit.display_style,
    "dropdown",
  );
  TestValidator.predicate(
    "size unit should be required for purchase",
    sizeUnit.is_required === true,
  );

  // Step 5: Validate property relationships
  TestValidator.equals(
    "all units belong to same product",
    colorUnit.product.id === textureUnit.product.id &&
      textureUnit.product.id === patternUnit.product.id &&
      patternUnit.product.id === sizeUnit.product.id,
    true,
  );

  TestValidator.equals(
    "product ID matches across all units",
    colorUnit.product.id,
    product.id,
  );

  // Step 6: Validate sort order configuration
  TestValidator.equals(
    "color unit has correct sort order for visual priority",
    colorUnit.sort_order,
    1,
  );
  TestValidator.equals(
    "texture unit has correct sort order for visual priority",
    textureUnit.sort_order,
    2,
  );
  TestValidator.equals(
    "pattern unit has correct sort order for visual priority",
    patternUnit.sort_order,
    3,
  );
  TestValidator.equals(
    "size unit has correct sort order for visual priority",
    sizeUnit.sort_order,
    4,
  );

  // Step 7: Test customer engagement optimization through visual presentation
  // Verify that visual units are configured properly for enhanced customer experience
  const visualUnits = [colorUnit, textureUnit, patternUnit];
  TestValidator.equals(
    "visual units support display style for visual selection",
    visualUnits.filter(
      (unit) =>
        unit.display_style === "swatches" || unit.display_style === "buttons",
    ).length,
    3,
  );

  // Validate that required visual properties are configured
  TestValidator.equals(
    "visual units have proper display styles",
    visualUnits.filter(
      (unit) =>
        unit.display_style === "swatches" || unit.display_style === "buttons",
    ).length,
    3,
  );

  // Test visual selection priority ordering
  TestValidator.equals(
    "visual units are prioritized in display order",
    colorUnit.sort_order < sizeUnit.sort_order &&
      textureUnit.sort_order < sizeUnit.sort_order,
    true,
  );
}
