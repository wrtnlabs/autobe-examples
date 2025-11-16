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
 * Validate that an authenticated seller can create a basic SKU option value
 * assignment for a single option value on a single SKU.
 *
 * Business flow:
 *
 * 1. Join as a seller to obtain authenticated seller context.
 * 2. Create a multi-SKU product owned by that seller.
 * 3. Create a single option type (e.g. COLOR) for that product.
 * 4. Create a single option value (e.g. RED) under that option type.
 * 5. Create a SKU for the product.
 * 6. Assign the RED option value to the SKU via SKU option value assignment.
 *
 * Validations:
 *
 * - All intermediate create operations succeed and return correctly typed DTOs.
 * - The final SKU option value assignment response references the expected
 *   productCode, skuCode, productOptionTypeCode, and productOptionValueCode.
 * - CreatedAt and updatedAt are populated.
 * - OrderIndex in the response matches the input orderIndex.
 */
export async function test_api_sku_option_value_assignment_create_basic_flow(
  connection: api.IConnection,
) {
  // 1. Seller join to obtain authenticated context
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a multi-SKU product for this seller
  const productCode = `P-${RandomGenerator.alphaNumeric(12)}`;

  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product code should match input code",
    product.code,
    productCode,
  );

  // 3. Create a single option type (COLOR)
  const optionTypeName = "COLOR";
  const optionTypeDisplayName = "Color";

  const optionTypeCreateBody = {
    name: optionTypeName,
    display_name: optionTypeDisplayName,
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 4. Create a single option value (RED) under this option type
  const optionValueCode = "RED";
  const optionValueDisplayName = "Red";

  const optionValueCreateBody = {
    value: optionValueCode,
    display_name: optionValueDisplayName,
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  TestValidator.equals(
    "created option value should have expected value code",
    optionValue.value,
    optionValueCode,
  );

  // 5. Create a SKU for the product
  const skuCode = `S-${RandomGenerator.alphaNumeric(10)}`;

  const skuCreateBody = {
    code: skuCode,
    name: `SKU ${optionValueDisplayName}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  TestValidator.equals(
    "created SKU code should match input skuCode",
    sku.code,
    skuCode,
  );

  // 6. Assign the option value to the SKU
  const orderIndex: number = 0;

  const assignmentCreateBody = {
    productOptionTypeCode: optionTypeName,
    productOptionValueCode: optionValueCode,
    orderIndex,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const assignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode,
        skuCode,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuOptionValueAssignment>(assignment);

  // Validate key linkage fields
  TestValidator.equals(
    "assignment should reference correct productCode",
    assignment.productCode,
    productCode,
  );
  TestValidator.equals(
    "assignment should reference correct skuCode",
    assignment.skuCode,
    skuCode,
  );
  TestValidator.equals(
    "assignment should reference correct option type code",
    assignment.productOptionTypeCode,
    optionTypeName,
  );
  TestValidator.equals(
    "assignment should reference correct option value code",
    assignment.productOptionValueCode,
    optionValueCode,
  );

  // Validate orderIndex and timestamps
  TestValidator.equals(
    "assignment orderIndex should match input",
    assignment.orderIndex,
    orderIndex,
  );

  await TestValidator.predicate(
    "assignment.createdAt should be a non-empty string",
    async () => assignment.createdAt.length > 0,
  );
  await TestValidator.predicate(
    "assignment.updatedAt should be a non-empty string",
    async () => assignment.updatedAt.length > 0,
  );
}
