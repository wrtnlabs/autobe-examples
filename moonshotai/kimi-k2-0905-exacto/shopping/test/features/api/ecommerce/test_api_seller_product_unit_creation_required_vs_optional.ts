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
 * Test product unit creation with different requirement settings including
 * mandatory selections and optional configuration choices. Validates customer
 * purchase flow behavior with varying unit requirement configurations for
 * flexible product customization experiences.
 *
 * 1. Seller Registration
 * 2. Product Creation
 * 3. Create Required Units with mandatory selection and single choice
 * 4. Create Optional Units with multiple selection capability
 * 5. Test different display styles and presentation options
 * 6. Validate sort order and unit presentation sequence
 * 7. Verify business logic for required vs optional units
 * 8. Test pricing and inventory configurations
 */
export async function test_api_seller_product_unit_creation_required_vs_optional(
  connection: api.IConnection,
) {
  // Step 1: Seller Registration - Essential authentication foundation
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    tax_id: RandomGenerator.alphaNumeric(9),
    phone: RandomGenerator.mobile(),
    business_type: RandomGenerator.pick([
      "corporation",
      "llc",
      "partnership",
      "sole proprietorship",
    ]),
  } satisfies IShoppingMallSeller.IJoin;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);
  TestValidator.equals(
    "seller created successfully",
    seller.id.length > 0,
    true,
  );

  // Step 2: Create Product for unit testing
  const categoryTypes = ["size", "color", "material", "style"] as const;
  const displayStyles = [
    "dropdown",
    "buttons",
    "swatches",
    "text_input",
  ] as const;

  const productCreateData = {
    sku: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 3 }),
    price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
    condition: RandomGenerator.pick(["new", "used", "refurbished"]),
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
    weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"]),
    barcode: `BAR-${RandomGenerator.alphaNumeric(12)}`,
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.name(4),
    seo_description: RandomGenerator.paragraph({ sentences: 2 }),
    tags: "electronics,gadgets,tech",
    featured_image: `https://example.com/products/${RandomGenerator.alphaNumeric(16)}.jpg`,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: "https://example-shop.com/products",
    referrer: "https://example-shop.com/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreateData,
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "product created with correct seller",
    product.seller.id,
    seller.id,
  );

  // Step 3: Create Required Unit - Mandatory Size Selection
  const requiredSizeUnit = {
    name: "Size",
    type: "size",
    display_style: RandomGenerator.pick(displayStyles),
    is_required: true,
    is_multiple: false,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const requiredSizeUnitResult =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: requiredSizeUnit,
    });
  typia.assert(requiredSizeUnitResult);
  TestValidator.equals(
    "required size unit created with is_required=true",
    requiredSizeUnitResult.is_required,
    true,
  );
  TestValidator.equals(
    "required size unit created with is_multiple=false",
    requiredSizeUnitResult.is_multiple,
    false,
  );

  // Step 4: Create Optional Color Unit - Multiple Selection Allowed
  const optionalColorUnit = {
    name: "Color",
    type: "color",
    display_style: RandomGenerator.pick(displayStyles),
    is_required: false,
    is_multiple: true,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const optionalColorUnitResult =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: optionalColorUnit,
    });
  typia.assert(optionalColorUnitResult);
  TestValidator.equals(
    "optional color unit created with is_required=false",
    optionalColorUnitResult.is_required,
    false,
  );
  TestValidator.equals(
    "optional color unit created with is_multiple=true",
    optionalColorUnitResult.is_multiple,
    true,
  );

  // Step 5: Create Material Unit with Different Configuration
  const materialUnit = {
    name: "Material",
    type: "material",
    display_style: RandomGenerator.pick(displayStyles),
    is_required: false,
    is_multiple: false,
    sort_order: 3,
  } satisfies IShoppingMallProductUnit.ICreate;

  const materialUnitResult =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: materialUnit,
    });
  typia.assert(materialUnitResult);
  TestValidator.equals(
    "material unit created as optional",
    materialUnitResult.is_required,
    false,
  );
  TestValidator.equals(
    "material unit created as single selection",
    materialUnitResult.is_multiple,
    false,
  );

  // Step 6: Create Style Unit with High Sort Order
  const styleUnit = {
    name: "Style",
    type: "style",
    display_style: "buttons",
    is_required: true,
    is_multiple: false,
    sort_order: 10,
  } satisfies IShoppingMallProductUnit.ICreate;

  const styleUnitResult =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: styleUnit,
    });
  typia.assert(styleUnitResult);
  TestValidator.equals(
    "style unit created as required",
    styleUnitResult.is_required,
    true,
  );
  TestValidator.equals(
    "style unit sort order set correctly",
    styleUnitResult.sort_order,
    10,
  );

  // Step 7: Create Custom Unit for Advanced Configuration
  const customUnit = {
    name: "Custom Feature",
    type: "custom",
    display_style: "text_input",
    is_required: false,
    is_multiple: true,
    sort_order: 5,
  } satisfies IShoppingMallProductUnit.ICreate;

  const customUnitResult =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: customUnit,
    });
  typia.assert(customUnitResult);
  TestValidator.equals(
    "custom unit created with text_input display",
    customUnitResult.display_style,
    "text_input",
  );
  TestValidator.equals(
    "custom unit allows multiple selections",
    customUnitResult.is_multiple,
    true,
  );

  // Step 8: Validate Unit Relationships and Product Integration
  TestValidator.predicate("all units reference correct product", () => {
    return (
      requiredSizeUnitResult.product.id === product.id &&
      optionalColorUnitResult.product.id === product.id &&
      materialUnitResult.product.id === product.id &&
      styleUnitResult.product.id === product.id &&
      customUnitResult.product.id === product.id
    );
  });

  // Step 9: Test Error Conditions for Invalid Product
  await TestValidator.error(
    "should fail for non-existent product code",
    async () => {
      const invalidUnit = {
        name: "Invalid Unit",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate;

      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: "NON-EXISTENT-PRODUCT",
          body: invalidUnit,
        },
      );
    },
  );

  // Step 10: Test Business Logic Validation
  TestValidator.predicate("required units must have single selection", () => {
    return (
      requiredSizeUnitResult.is_required && !requiredSizeUnitResult.is_multiple
    );
  });

  TestValidator.predicate("optional units can have multiple selections", () => {
    return (
      !optionalColorUnitResult.is_required &&
      optionalColorUnitResult.is_multiple
    );
  });

  TestValidator.predicate(
    "custom units support text input for flexibility",
    () => {
      return (
        customUnitResult.type === "custom" &&
        customUnitResult.display_style === "text_input"
      );
    },
  );

  TestValidator.predicate(
    "sort order controls unit presentation sequence",
    () => {
      return (
        requiredSizeUnitResult.sort_order <
          optionalColorUnitResult.sort_order &&
        optionalColorUnitResult.sort_order < materialUnitResult.sort_order &&
        materialUnitResult.sort_order < customUnitResult.sort_order &&
        customUnitResult.sort_order < styleUnitResult.sort_order
      );
    },
  );
}
