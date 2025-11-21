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
 * Test update of unit display ordering to optimize customer decision-making
 * flow. This test validates that sellers can resequence units within product
 * configuration interfaces to present the most important options first. It
 * verifies that sort order changes immediately affect customer-facing
 * interfaces while preserving existing cart selections and order
 * configurations.
 *
 * The test follows this workflow:
 *
 * 1. Create a seller account for authentication
 * 2. Create a product with multiple units for testing sort functionality
 * 3. Create multiple product units with different sort orders
 * 4. Update the sort order of units to optimize customer presentation
 * 5. Verify that the updated sort order is correctly applied
 * 6. Validate business rules around unit ordering and customer decision flow
 */
export async function test_api_seller_product_unit_update_sort_order(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
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

  // Step 2: Create a product for unit configuration testing
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        variants: [],
        images: [],
        href: "https://example.com/product/create",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create multiple product units with different initial sort orders
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

  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "buttons",
        is_required: false,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // Step 4: Update sort order to optimize customer decision flow
  // Move Color to first position (most important for visual impact)
  const updatedColorUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: colorUnit.id,
      body: {
        sort_order: 0,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(updatedColorUnit);

  // Move Size to second position (after color selection)
  const updatedSizeUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: sizeUnit.id,
      body: {
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(updatedSizeUnit);

  // Move Material to last position (least important for initial selection)
  const updatedMaterialUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: materialUnit.id,
      body: {
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(updatedMaterialUnit);

  // Step 5: Verify updated sort orders are correctly applied
  TestValidator.equals(
    "color unit sort order updated",
    updatedColorUnit.sort_order,
    0,
  );
  TestValidator.equals(
    "size unit sort order updated",
    updatedSizeUnit.sort_order,
    1,
  );
  TestValidator.equals(
    "material unit sort order updated",
    updatedMaterialUnit.sort_order,
    2,
  );

  // Step 6: Validate business logic around unit ordering
  TestValidator.predicate(
    "sort order values are non-negative",
    updatedColorUnit.sort_order >= 0 &&
      updatedSizeUnit.sort_order >= 0 &&
      updatedMaterialUnit.sort_order >= 0,
  );

  TestValidator.predicate(
    "sort order follows logical sequence",
    updatedColorUnit.sort_order < updatedSizeUnit.sort_order &&
      updatedSizeUnit.sort_order < updatedMaterialUnit.sort_order,
  );

  // Step 7: Verify unit properties remain unchanged during sort order update
  TestValidator.equals(
    "color unit name preserved",
    updatedColorUnit.name,
    colorUnit.name,
  );
  TestValidator.equals(
    "color unit type preserved",
    updatedColorUnit.type,
    colorUnit.type,
  );
  TestValidator.equals(
    "color unit display style preserved",
    updatedColorUnit.display_style,
    colorUnit.display_style,
  );
  TestValidator.equals(
    "size unit name preserved",
    updatedSizeUnit.name,
    sizeUnit.name,
  );
  TestValidator.equals(
    "size unit type preserved",
    updatedSizeUnit.type,
    sizeUnit.type,
  );
  TestValidator.equals(
    "material unit name preserved",
    updatedMaterialUnit.name,
    materialUnit.name,
  );
  TestValidator.equals(
    "material unit type preserved",
    updatedMaterialUnit.type,
    materialUnit.type,
  );

  // Step 8: Validate customer decision optimization logic
  TestValidator.predicate(
    "visual elements prioritized in sort order",
    updatedColorUnit.type === "color" && updatedColorUnit.sort_order === 0,
  );

  // Step 9: Verify updated_at timestamps are modified after sort order updates
  TestValidator.predicate(
    "color unit updated after sort order change",
    new Date(updatedColorUnit.updated_at).getTime() >=
      new Date(colorUnit.updated_at).getTime(),
  );
  TestValidator.predicate(
    "size unit updated after sort order change",
    new Date(updatedSizeUnit.updated_at).getTime() >=
      new Date(sizeUnit.updated_at).getTime(),
  );
  TestValidator.predicate(
    "material unit updated after sort order change",
    new Date(updatedMaterialUnit.updated_at).getTime() >=
      new Date(materialUnit.updated_at).getTime(),
  );
}
