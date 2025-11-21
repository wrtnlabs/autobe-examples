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
 * Test seller creation of measurement-based product units including length,
 * width, height, weight, capacity, and dimensional variations. Validates
 * measurement unit configuration, display interface optimization, inventory
 * tracking by measurement, and customer selection accuracy for products where
 * dimensional precision is critical for purchase satisfaction and proper fit.
 */
export async function test_api_seller_unit_creation_measurement_variations(
  connection: api.IConnection,
) {
  // 1. Create seller account for measurement-based unit creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    business_name: RandomGenerator.name(2),
    business_registration_number: RandomGenerator.alphaNumeric(12),
    tax_id: RandomGenerator.alphaNumeric(9),
    phone: RandomGenerator.mobile(),
    business_type: "corporation",
  } satisfies IShoppingMallSeller.IJoin;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // 2. Create product requiring measurement-based configuration
  const productCode = `MEASURE-${RandomGenerator.alphaNumeric(8)}`;
  const productData = {
    sku: productCode,
    name: "Premium Customizable Furniture",
    description:
      "High-quality furniture with customizable dimensions and measurement options",
    price: 999.99,
    condition: "new",
    weight: 45.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: `https://marketplace.example.com/products/${productCode}` satisfies string &
      tags.Format<"uri">,
    referrer:
      "https://marketplace.example.com/categories/furniture" satisfies string &
        tags.Format<"uri">,
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productData },
  );
  typia.assert(product);

  // 3. Create size measurement unit (dropdown selection)
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

  // 4. Create length measurement unit (button selection)
  const lengthUnitData = {
    name: "Length",
    type: "size",
    display_style: "buttons",
    is_required: true,
    is_multiple: false,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const lengthUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: lengthUnitData,
    });
  typia.assert(lengthUnit);

  // 5. Create weight capacity unit (swatches with multiple selection)
  const capacityUnitData = {
    name: "Load Capacity",
    type: "custom",
    display_style: "swatches",
    is_required: true,
    is_multiple: true,
    sort_order: 3,
  } satisfies IShoppingMallProductUnit.ICreate;

  const capacityUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: capacityUnitData,
    });
  typia.assert(capacityUnit);

  // 6. Create optional customization unit (text input)
  const customUnitData = {
    name: "Custom Dimensions",
    type: "custom",
    display_style: "text_input",
    is_required: false,
    is_multiple: true,
    sort_order: 4,
  } satisfies IShoppingMallProductUnit.ICreate;

  const customUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: customUnitData,
    });
  typia.assert(customUnit);

  // 7. Validate all measurement units were created correctly
  TestValidator.equals("Size unit type matches", sizeUnit.type, "size");
  TestValidator.equals(
    "Length unit display style",
    lengthUnit.display_style,
    "buttons",
  );
  TestValidator.equals(
    "Capacity unit allows multiple selection",
    capacityUnit.is_multiple,
    true,
  );
  TestValidator.equals(
    "Capacity unit type is custom for load capacity",
    capacityUnit.type,
    "custom",
  );
  TestValidator.equals(
    "Custom unit is optional",
    customUnit.is_required,
    false,
  );
  TestValidator.equals(
    "Custom unit allows text input",
    customUnit.display_style,
    "text_input",
  );

  // 8. Verify unit configuration details
  TestValidator.equals(
    "Units are sorted correctly",
    sizeUnit.sort_order < lengthUnit.sort_order &&
      lengthUnit.sort_order < capacityUnit.sort_order &&
      capacityUnit.sort_order < customUnit.sort_order,
    true,
  );

  // 9. Validate measurement configuration completeness
  const requiredUnits = [sizeUnit, lengthUnit, capacityUnit];
  TestValidator.predicate(
    "All required units are marked as required",
    requiredUnits.every((unit) => unit.is_required === true),
  );

  const multipleSelectionUnits = [capacityUnit, customUnit];
  TestValidator.predicate(
    "Units allowing multiple selection are configured correctly",
    multipleSelectionUnits.every((unit) => unit.is_multiple === true),
  );

  // 10. Test unit display style variations make business sense
  TestValidator.predicate(
    "Dropdown style used for standardized size selection",
    sizeUnit.display_style === "dropdown",
  );

  TestValidator.predicate(
    "Button style used for visual length options",
    lengthUnit.display_style === "buttons",
  );

  TestValidator.predicate(
    "Swatches used for capacity visualization",
    capacityUnit.display_style === "swatches",
  );

  TestValidator.predicate(
    "Text input used for custom dimension specification",
    customUnit.display_style === "text_input",
  );
}
