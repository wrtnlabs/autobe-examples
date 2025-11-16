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
 * Validate that updating a SKU option value assignment into a conflicting (SKU,
 * option value) combination is rejected.
 *
 * Business intent
 *
 * - Ensure the backend enforces uniqueness of (shopping_mall_product_sku_id,
 *   shopping_mall_product_option_value_id) pairs.
 * - When a seller attempts to repoint an existing assignment to an option value
 *   already assigned to the same SKU, the update must fail.
 *
 * Scenario
 *
 * 1. Register a seller using auth.seller.join and rely on the SDK to inject the
 *    Authorization header into the connection.
 * 2. Create a multi-SKU product for that seller.
 * 3. Under that product, create one option type (e.g., SIZE).
 * 4. Under that option type, create two option values (e.g., S and M).
 * 5. Create a SKU under the product.
 * 6. Create two SKU option value assignments for the same SKU and option type, one
 *    pointing to S and the other to M.
 * 7. Attempt to update the S assignment so that it points to the same option value
 *    M already referenced by the other assignment, using the
 *    product_option_value_id of the M option value.
 * 8. Verify that the update call fails.
 *
 * Constraints & notes
 *
 * - All request bodies must satisfy their DTO types; no negative type tests.
 * - We cannot read back assignments via list APIs (none provided), so we assert
 *   only that the conflicting update attempt throws.
 * - We do not assert on HTTP status codes, only that an error is thrown.
 */
export async function test_api_sku_option_value_assignment_update_reject_conflicting_combination(
  connection: api.IConnection,
) {
  // 1. Seller joins (registration + authentication)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a multi-SKU product for this seller
  const productCode = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: null,
    description: null,
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create a single option type (SIZE) for this product
  const optionTypeName = "SIZE";
  const optionTypeCreateBody = {
    name: optionTypeName,
    display_name: optionTypeName,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 4. Create two option values (S and M) under this option type
  const optionValueSCreate = {
    value: "S",
    display_name: "Small",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueMCreate = {
    value: "M",
    display_name: "Medium",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueS =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueSCreate,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValueS);

  const optionValueM =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueMCreate,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValueM);

  // 5. Create a SKU under the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(6)}`;
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: skuCreateBody,
    },
  );
  typia.assert<IShoppingMallProductSku>(sku);

  // 6. Create two assignments for this SKU: one for S and one for M
  const assignmentSCreate = {
    productOptionTypeCode: optionType.name,
    productOptionValueCode: optionValueS.value,
    orderIndex: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const assignmentMCreate = {
    productOptionTypeCode: optionType.name,
    productOptionValueCode: optionValueM.value,
    orderIndex: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const assignmentS =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: assignmentSCreate,
      },
    );
  typia.assert<IShoppingMallSkuOptionValueAssignment>(assignmentS);

  const assignmentM =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: assignmentMCreate,
      },
    );
  typia.assert<IShoppingMallSkuOptionValueAssignment>(assignmentM);

  // 7. Attempt conflicting update: repoint S-assignment to the same option value as M
  const conflictingUpdateBody = {
    product_option_value_id: optionValueM.id,
  } satisfies IShoppingMallSkuOptionValueAssignment.IUpdate;

  await TestValidator.error(
    "conflicting SKU-option value assignment update must fail",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.update(
        connection,
        {
          productCode: product.code,
          skuCode: sku.code,
          skuOptionValueAssignmentId: assignmentS.id,
          body: conflictingUpdateBody,
        },
      );
    },
  );
}
