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
 * Validate idempotent-like behavior of deleting a SKU option value assignment.
 *
 * This scenario ensures that when a seller deletes a specific SKU option value
 * assignment, the first DELETE call succeeds, and a second DELETE on the same
 * resource properly fails with an HTTP error (e.g., not-found), demonstrating
 * that the resource was removed and the API does not silently treat repeated
 * deletes as success.
 *
 * End-to-end flow:
 *
 * 1. Register a seller (POST /auth/seller/join) to obtain an authenticated seller
 *    context.
 * 2. Create a multi-SKU product for that seller (POST
 *    /shoppingMall/seller/products).
 * 3. Under that product, create a SKU (POST
 *    /shoppingMall/seller/products/{productCode}/skus).
 * 4. Define an option type for the product (POST
 *    /shoppingMall/seller/products/{productCode}/optionTypes).
 * 5. Create an option value for that option type (POST
 *    /shoppingMall/seller/products/{productCode}/optionTypes/{productOptionTypeId}/values).
 * 6. Create a SKU option value assignment linking the SKU with the option value
 *    (POST
 *    /shoppingMall/seller/products/{productCode}/skus/{skuCode}/optionValueAssignments).
 * 7. First deletion: DELETE the created assignment once and assert that no error
 *    is thrown.
 * 8. Second deletion: DELETE the same assignment again and assert via
 *    TestValidator.httpError that an HTTP error is raised, indicating the
 *    resource no longer exists.
 */
export async function test_api_seller_sku_option_value_assignment_delete_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Register a seller to get an authenticated seller context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a multi-SKU product owned by this seller
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create a SKU under this product
  const skuCode: string = RandomGenerator.alphaNumeric(10);
  const skuBody = {
    code: skuCode,
    name: `${product.name} / ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);
  TestValidator.equals(
    "created SKU should have requested code",
    sku.code,
    skuCode,
  );

  // 4. Define an option type for the product
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 5. Create an option value under this option type
  const optionValueBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  // 6. Create SKU option value assignment
  const assignmentBody = {
    productOptionTypeCode: optionValue.optionType.name,
    productOptionValueCode: optionValue.value,
    orderIndex: 0,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const assignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: assignmentBody,
      },
    );
  typia.assert<IShoppingMallSkuOptionValueAssignment>(assignment);

  // 7. First deletion: must succeed without throwing
  await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.erase(
    connection,
    {
      productCode: product.code,
      skuCode: sku.code,
      skuOptionValueAssignmentId: assignment.id,
    },
  );

  // 8. Second deletion: must fail with an HTTP error (resource already gone)
  await TestValidator.httpError(
    "second deletion of same assignment should result in HTTP error",
    [404, 400, 409, 410],
    async () => {
      await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.erase(
        connection,
        {
          productCode: product.code,
          skuCode: sku.code,
          skuOptionValueAssignmentId: assignment.id,
        },
      );
    },
  );
}
