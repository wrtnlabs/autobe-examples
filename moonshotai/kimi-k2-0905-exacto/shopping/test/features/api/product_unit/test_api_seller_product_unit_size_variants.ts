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
 * Test creating size-based product unit enabling comprehensive apparel and shoe
 * sizing configuration with international standards.
 *
 * This test validates that sellers can define size selection systems
 * accommodating both standard (XS-XXL) and custom sizing schemes while
 * providing clear customer-facing size guides and enabling accurate inventory
 * management for each distinct size option across diverse product categories
 * from clothing to furniture dimensions.
 *
 * Test flow:
 *
 * 1. Create seller account for authentication
 * 2. Create a product suitable for size variations (apparel/shoes)
 * 3. Create multiple size units with different configurations:
 *
 *    - Standard clothing sizes (XS-XXL) with dropdown display
 *    - Shoe sizes with international standards (EU/US/UK) using button display
 *    - Custom furniture dimensions with text input
 * 4. Validate unit creation responses and business rules
 * 5. Test error scenarios for invalid configurations
 */
export async function test_api_seller_product_unit_size_variants(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for size unit testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "Corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create size-relevant product for testing
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `SIZE-TEST-${RandomGenerator.alphaNumeric(8)}`,
        name: "Premium Cotton T-Shirt",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<20> & tags.Maximum<200>
        >(),
        condition: "new",
        weight: 0.3,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: "550e8400-e29b-41d4-a716-446655440000", // Use a valid existing category ID
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/products/create",
        referrer: "https://example.com/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create standard clothing size unit (XS-XXL) with dropdown display
  const clothingSizeUnit =
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
  typia.assert(clothingSizeUnit);

  TestValidator.equals(
    "clothing size unit name",
    clothingSizeUnit.name,
    "Size",
  );
  TestValidator.equals(
    "clothing size unit type",
    clothingSizeUnit.type,
    "size",
  );
  TestValidator.equals(
    "clothing size display style",
    clothingSizeUnit.display_style,
    "dropdown",
  );
  TestValidator.equals(
    "clothing size is required",
    clothingSizeUnit.is_required,
    true,
  );
  TestValidator.equals(
    "clothing size sort order",
    clothingSizeUnit.sort_order,
    1,
  );

  // Step 4: Create shoe size unit with international standards using button display
  const shoeSizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Shoe Size",
        type: "size",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(shoeSizeUnit);

  TestValidator.equals("shoe size unit name", shoeSizeUnit.name, "Shoe Size");
  TestValidator.equals("shoe size unit type", shoeSizeUnit.type, "size");
  TestValidator.equals(
    "shoe size display style",
    shoeSizeUnit.display_style,
    "buttons",
  );
  TestValidator.equals("shoe size is required", shoeSizeUnit.is_required, true);
  TestValidator.equals("shoe size sort order", shoeSizeUnit.sort_order, 2);

  // Step 5: Create furniture dimension unit with custom sizing using text input
  const furnitureSizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Dimensions",
        type: "custom",
        display_style: "text_input",
        is_required: false,
        is_multiple: true,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(furnitureSizeUnit);

  TestValidator.equals(
    "furniture size unit name",
    furnitureSizeUnit.name,
    "Dimensions",
  );
  TestValidator.equals(
    "furniture size unit type",
    furnitureSizeUnit.type,
    "custom",
  );
  TestValidator.equals(
    "furniture size display style",
    furnitureSizeUnit.display_style,
    "text_input",
  );
  TestValidator.equals(
    "furniture size is required",
    furnitureSizeUnit.is_required,
    false,
  );
  TestValidator.equals(
    "furniture size is multiple",
    furnitureSizeUnit.is_multiple,
    true,
  );
  TestValidator.equals(
    "furniture size sort order",
    furnitureSizeUnit.sort_order,
    3,
  );

  // Step 6: Test validation - ensure all units are properly linked to product
  TestValidator.equals(
    "clothing size product ID",
    clothingSizeUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "shoe size product ID",
    shoeSizeUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "furniture size product ID",
    furnitureSizeUnit.product.id,
    product.id,
  );

  // Step 7: Test error scenario - duplicate unit name should fail
  await TestValidator.error("duplicate unit name should fail", async () => {
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size", // Duplicate name
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 4,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  });

  // Step 8: Test error scenario - invalid display style should fail
  await TestValidator.error("invalid display style should fail", async () => {
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Invalid Size",
        type: "size",
        display_style: "invalid_style", // Invalid display style
        is_required: true,
        is_multiple: false,
        sort_order: 4,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  });

  // Step 9: Create unit without product ownership (should fail)
  const differentProductSku = `DIFF-SIZE-${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.error(
    "unit creation for non-owned product should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: differentProductSku, // Product doesn't exist or not owned by seller
          body: {
            name: "Unauthorized Size",
            type: "size",
            display_style: "dropdown",
            is_required: true,
            is_multiple: false,
            sort_order: 1,
          } satisfies IShoppingMallProductUnit.ICreate,
        },
      );
    },
  );
}
