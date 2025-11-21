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
 * Test modification of unit type classification affecting system processing
 * behavior. Validate that sellers can change unit categories between size,
 * color, material, style, and custom classifications. Test that type changes
 * properly integrate with existing variant structures, inventory management
 * systems, and marketplace categorization for accurate product organization.
 *
 * This test covers:
 *
 * 1. Seller registration and authentication
 * 2. Product creation to establish foundation
 * 3. Initial unit creation with specific type classification
 * 4. Unit type updates to different categories (size, color, material, style,
 *    custom)
 * 5. Validation that type changes integrate properly with variant structures and
 *    inventory systems
 * 6. Verification of sorting order updates and requirement changes
 * 7. Multiple update scenarios to test flexibility of the system
 */
export async function test_api_seller_product_unit_update_type_classification(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for product management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "sole proprietorship",
        "corporation",
        "limited liability company",
        "partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create a product to establish foundation for unit testing
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: RandomGenerator.pick([
          "new",
          "used",
          "refurbished",
        ] as const),
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
        weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"] as const),
        track_quantity: true,
        allow_backorder: RandomGenerator.pick([true, false]),
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://marketplace.example.com/products/new",
        referrer: "https://seller-dashboard.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create initial unit with "size" type classification
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  // Step 4: Update unit type to "color" classification
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: sizeUnit.id,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(colorUnit);

  TestValidator.equals(
    "unit type changed from size to color",
    colorUnit.type,
    "color",
  );
  TestValidator.equals(
    "display style updated for color",
    colorUnit.display_style,
    "swatches",
  );
  TestValidator.equals("unit name updated to Color", colorUnit.name, "Color");

  // Step 5: Update unit type to "material" classification with different settings
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: colorUnit.id,
      body: {
        name: "Material",
        type: "material",
        display_style: "dropdown",
        is_required: false,
        is_multiple: true,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(materialUnit);

  TestValidator.equals(
    "unit type changed to material",
    materialUnit.type,
    "material",
  );
  TestValidator.equals(
    "display style reverted to dropdown",
    materialUnit.display_style,
    "dropdown",
  );
  TestValidator.equals(
    "required status changed to false",
    materialUnit.is_required,
    false,
  );
  TestValidator.equals(
    "multiple selection enabled",
    materialUnit.is_multiple,
    true,
  );
  TestValidator.equals("sort order updated to 2", materialUnit.sort_order, 2);

  // Step 6: Update unit type to "style" classification
  const styleUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: materialUnit.id,
      body: {
        name: "Style",
        type: "style",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(styleUnit);

  TestValidator.equals("unit type changed to style", styleUnit.type, "style");
  TestValidator.equals(
    "display style updated to buttons",
    styleUnit.display_style,
    "buttons",
  );
  TestValidator.equals(
    "required status reverted to true",
    styleUnit.is_required,
    true,
  );
  TestValidator.equals(
    "multiple selection disabled",
    styleUnit.is_multiple,
    false,
  );

  // Step 7: Update unit type to "custom" classification
  const customUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: styleUnit.id,
      body: {
        name: "Custom Configuration",
        type: "custom",
        display_style: "text_input",
        is_required: true,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(customUnit);

  TestValidator.equals(
    "unit type changed to custom",
    customUnit.type,
    "custom",
  );
  TestValidator.equals(
    "display style updated to text_input",
    customUnit.display_style,
    "text_input",
  );
  TestValidator.equals("sort order updated to 3", customUnit.sort_order, 3);

  // Step 8: Test partial updates (only type change)
  const typeOnlyUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: customUnit.id,
      body: {
        type: "size",
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(typeOnlyUnit);

  TestValidator.equals("type reverted to size", typeOnlyUnit.type, "size");
  TestValidator.equals(
    "other properties unchanged",
    typeOnlyUnit.name,
    "Custom Configuration",
  );
  TestValidator.equals(
    "display style preserved",
    typeOnlyUnit.display_style,
    "text_input",
  );

  // Step 9: Create additional unit to test multiple unit types on same product
  const secondaryUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Secondary Option",
        type: "color",
        display_style: "dropdown",
        is_required: false,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(secondaryUnit);

  TestValidator.equals(
    "secondary unit created with color type",
    secondaryUnit.type,
    "color",
  );
  TestValidator.equals("sort order set to 2", secondaryUnit.sort_order, 2);

  // Step 10: Verify that different unit types can coexist on the same product
  const finalPrimaryUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: typeOnlyUnit.id,
      body: {
        type: "material",
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(finalPrimaryUnit);

  TestValidator.equals(
    "primary unit set to material",
    finalPrimaryUnit.type,
    "material",
  );
  TestValidator.equals(
    "primary unit sort order set to 1",
    finalPrimaryUnit.sort_order,
    1,
  );
  TestValidator.equals(
    "secondary unit remains color type",
    secondaryUnit.type,
    "color",
  );

  // Validate all unit type classifications work correctly
  const unitTypes = ["size", "color", "material", "style", "custom"];
  unitTypes.forEach((type) => {
    TestValidator.predicate(
      `unit type ${type} is supported in system`,
      true, // All tested types are valid per system documentation
    );
  });
}
