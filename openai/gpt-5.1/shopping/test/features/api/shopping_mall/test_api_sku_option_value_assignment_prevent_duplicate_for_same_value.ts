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
 * Validate that SKU option value assignments cannot be duplicated for the same
 * SKU/value pair.
 *
 * Business workflow
 *
 * 1. Register a seller and obtain authenticated seller context.
 * 2. Create a multi-SKU product owned by this seller.
 * 3. Define a single option type (e.g. SIZE) for the product.
 * 4. Define a single option value (e.g. M / Medium) under that option type.
 * 5. Create a SKU (e.g. SKU-XXXX) for the product.
 * 6. Create one SKU option value assignment linking that SKU to the option value.
 * 7. Attempt to create the exact same assignment again and assert that it fails.
 *
 * Validations
 *
 * - The first assignment creation succeeds and returns a well-typed
 *   IShoppingMallSkuOptionValueAssignment whose productCode/skuCode and option
 *   codes match the inputs.
 * - The second attempt with identical payload throws an error, reflecting the
 *   uniqueness constraint on the underlying (sku, option value) pair.
 */
export async function test_api_sku_option_value_assignment_prevent_duplicate_for_same_value(
  connection: api.IConnection,
) {
  // 1. Register seller (authentication context)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Create multi-SKU product for this seller
  const productCode: string = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
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
    "product code must equal requested code",
    product.code,
    productCode,
  );

  // 3. Create option type for the product
  const optionTypeCode = "SIZE";

  const optionTypeBody = {
    name: optionTypeCode,
    display_name: "Size",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  // 4. Create option value for the option type
  const optionValueCode = "M";

  const optionValueBody = {
    value: optionValueCode,
    display_name: "Medium",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  TestValidator.equals(
    "created option value must reflect requested value",
    optionValue.value,
    optionValueCode,
  );

  // 5. Create SKU under the product
  const skuCode: string = `SKU-${RandomGenerator.alphaNumeric(8)}`;

  const skuBody = {
    code: skuCode,
    name: `${product.name} / ${optionValueCode}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuBody,
    });
  typia.assert(sku);

  TestValidator.equals(
    "sku must be created under requested productCode",
    sku.productCode,
    product.code,
  );
  TestValidator.equals(
    "sku code must equal requested skuCode",
    sku.code,
    skuCode,
  );

  // 6. First SKU option value assignment (expected to succeed)
  const assignmentBody = {
    productOptionTypeCode: optionTypeCode,
    productOptionValueCode: optionValueCode,
    orderIndex: 0,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const assignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode,
        skuCode,
        body: assignmentBody,
      },
    );
  typia.assert(assignment);

  TestValidator.equals(
    "assignment productCode must match product",
    assignment.productCode,
    product.code,
  );
  TestValidator.equals(
    "assignment skuCode must match sku",
    assignment.skuCode,
    sku.code,
  );
  TestValidator.equals(
    "assignment option type code must match request",
    assignment.productOptionTypeCode,
    optionTypeCode,
  );
  TestValidator.equals(
    "assignment option value code must match request",
    assignment.productOptionValueCode,
    optionValueCode,
  );

  // 7. Second, duplicate assignment (expected to fail)
  await TestValidator.error(
    "duplicate sku-option value assignment must fail",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
        connection,
        {
          productCode,
          skuCode,
          body: assignmentBody,
        },
      );
    },
  );
}
