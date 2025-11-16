import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSkuOptionValueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionValueAssignment";

/**
 * Validate updating a SKU option value assignment to a different option value.
 *
 * Business context: A seller manages a multi-SKU product whose variants are
 * defined by option types (e.g., COLOR) and option values (e.g., BLUE, GREEN).
 * Each SKU is linked to concrete option values via sku-option-value
 * assignments. When the seller wants to change which option value a SKU points
 * to for a given option type (for example, correcting a wrong COLOR mapping),
 * they use the PUT
 * /shoppingMall/seller/products/{productCode}/skus/{skuCode}/optionValueAssignments/{skuOptionValueAssignmentId}
 * endpoint.
 *
 * This test covers the full workflow required to exercise that update:
 *
 * 1. Register a seller and establish authentication.
 * 2. Create a multi-SKU product owned by that seller.
 * 3. Create a COLOR option type for that product.
 * 4. Create two COLOR option values (BLUE and GREEN).
 * 5. Create a SKU under the product.
 * 6. Create an initial sku-option-value assignment pointing to BLUE.
 * 7. Update that assignment so it points to GREEN instead.
 *
 * The test then validates that:
 *
 * - The update call succeeds with a well-typed
 *   IShoppingMallSkuOptionValueAssignment response.
 * - The assignment's id, productCode, and skuCode remain unchanged.
 * - The assignment's productOptionValueCode changes from BLUE to GREEN.
 * - We implicitly respect the uniqueness constraint of (SKU, option value)
 *   because the backend accepts the update without creating a second row and
 *   without error.
 */
export async function test_api_sku_option_value_assignment_update_change_value(
  connection: api.IConnection,
) {
  // 1. Register seller and get authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Create multi-SKU product
  const productCode = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.name(),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "created product code matches input code",
    product.code,
    productCode,
  );

  // 3. Create COLOR option type
  const optionTypeCreateBody = {
    name: "COLOR",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 4. Create two option values: BLUE and GREEN
  const blueValueBody = {
    value: "BLUE",
    display_name: "Blue",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const blueValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: blueValueBody,
      },
    );
  typia.assert(blueValue);

  const greenValueBody = {
    value: "GREEN",
    display_name: "Green",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const greenValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: greenValueBody,
      },
    );
  typia.assert(greenValue);

  // 5. Create a SKU under the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} - Variant`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);
  TestValidator.equals(
    "created SKU code matches input skuCode",
    sku.code,
    skuCode,
  );

  // 6. Create initial SKU option value assignment pointing to BLUE
  const assignmentCreateBody = {
    productOptionTypeCode: optionType.name,
    productOptionValueCode: blueValue.value,
    orderIndex: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const initialAssignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert(initialAssignment);

  TestValidator.equals(
    "initial assignment productCode should match product.code",
    initialAssignment.productCode,
    product.code,
  );
  TestValidator.equals(
    "initial assignment skuCode should match sku.code",
    initialAssignment.skuCode,
    sku.code,
  );
  TestValidator.equals(
    "initial assignment productOptionValueCode should match BLUE",
    initialAssignment.productOptionValueCode,
    blueValue.value,
  );

  // 7. Update assignment to point to GREEN using IUpdate.product_option_value_id
  const updateBody = {
    product_option_value_id: greenValue.id,
  } satisfies IShoppingMallSkuOptionValueAssignment.IUpdate;

  const updatedAssignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.update(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        skuOptionValueAssignmentId: initialAssignment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAssignment);

  // Validate id and scoping fields are preserved
  TestValidator.equals(
    "assignment id should remain the same after update",
    updatedAssignment.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "updated assignment productCode should still match product.code",
    updatedAssignment.productCode,
    product.code,
  );
  TestValidator.equals(
    "updated assignment skuCode should still match sku.code",
    updatedAssignment.skuCode,
    sku.code,
  );

  // Validate that option value code has changed to GREEN
  TestValidator.equals(
    "updated assignment should now point to GREEN option value code",
    updatedAssignment.productOptionValueCode,
    greenValue.value,
  );

  // Ensure that the option value code actually changed from BLUE to GREEN
  TestValidator.notEquals(
    "updated assignment option value code should differ from original BLUE",
    updatedAssignment.productOptionValueCode,
    initialAssignment.productOptionValueCode,
  );
}
