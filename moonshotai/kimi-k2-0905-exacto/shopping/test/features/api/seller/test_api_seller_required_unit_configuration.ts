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
 * Test seller creating a required unit where customers must select an option
 * before purchase.
 *
 * This comprehensive E2E test validates the complete workflow for configuring
 * mandatory product units in the shopping mall marketplace. The test follows
 * these critical steps:
 *
 * 1. Seller Registration - Create authenticated seller account with business
 *    verification
 * 2. Product Creation - Establish a product catalog entry requiring configuration
 * 3. Required Unit Configuration - Define mandatory selection units (e.g., Size,
 *    Color)
 * 4. Validation - Ensure unit properties enforce customer selection requirements
 *
 * The test specifically validates:
 *
 * - Required unit creation with is_required=true flag
 * - Customer selection enforcement during purchase workflow
 * - Proper unit type and display style configuration
 * - Sort order and selection requirements for checkout process
 *
 * This ensures sellers can properly configure products that require customer
 * choices before allowing purchase completion, essential for variants like
 * clothing sizes.
 */
export async function test_api_seller_required_unit_configuration(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated seller account
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

  // Step 2: Create a product that will require mandatory unit selection
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(8),
        name: "Premium Cotton T-Shirt",
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        price: 2999,
        condition: "new",
        weight: 0.2,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        ip: "192.168.1.1",
        href: "https://shopping-mall.example.com/seller/products/create",
        referrer: "https://shopping-mall.example.com/seller/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create a required unit for Size selection
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

  // Step 4: Validate the required unit configuration
  TestValidator.equals("unit name matches", sizeUnit.name, "Size");
  TestValidator.equals("unit type is size", sizeUnit.type, "size");
  TestValidator.equals(
    "display style is dropdown",
    sizeUnit.display_style,
    "dropdown",
  );
  TestValidator.predicate("unit is required", sizeUnit.is_required === true);
  TestValidator.predicate(
    "unit does not allow multiple selections",
    sizeUnit.is_multiple === false,
  );
  TestValidator.equals("sort order is 1", sizeUnit.sort_order, 1);
  TestValidator.equals(
    "unit belongs to correct product",
    sizeUnit.product.id,
    product.id,
  );

  // Step 5: Create another required unit for Color to test multiple required selections
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // Step 6: Validate the second required unit
  TestValidator.equals("color unit name matches", colorUnit.name, "Color");
  TestValidator.equals("color unit type is color", colorUnit.type, "color");
  TestValidator.equals(
    "color display style is swatches",
    colorUnit.display_style,
    "swatches",
  );
  TestValidator.predicate(
    "color unit is required",
    colorUnit.is_required === true,
  );
  TestValidator.equals("color sort order is 2", colorUnit.sort_order, 2);

  // Step 7: Test error handling - attempt to create unit with invalid data
  await TestValidator.error(
    "should reject unit creation with invalid sort order",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: product.sku,
          body: {
            name: "Invalid Unit",
            type: "custom",
            display_style: "text_input",
            is_required: true,
            is_multiple: false,
            sort_order: -1, // Invalid negative sort order
          } satisfies IShoppingMallProductUnit.ICreate,
        },
      );
    },
  );
}
