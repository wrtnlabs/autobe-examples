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

export async function test_api_sku_option_value_assignment_invalid_value_for_product(
  connection: api.IConnection,
) {
  // 1. Register seller and obtain authenticated session
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create two products A and B for this seller
  const productCodeA = `PROD-A-${RandomGenerator.alphaNumeric(8)}`;
  const productCodeB = `PROD-B-${RandomGenerator.alphaNumeric(8)}`;

  const productCreateBase = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies Omit<IShoppingMallProduct.ICreate, "code" | "name">;

  const productACreate: IShoppingMallProduct.ICreate = {
    ...productCreateBase,
    code: productCodeA,
    name: `Product A ${RandomGenerator.name(1)}`,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreate,
    });
  typia.assert<IShoppingMallProduct>(productA);
  TestValidator.equals(
    "product A code should match request",
    productA.code,
    productCodeA,
  );

  const productBCreate: IShoppingMallProduct.ICreate = {
    ...productCreateBase,
    code: productCodeB,
    name: `Product B ${RandomGenerator.name(1)}`,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBCreate,
    });
  typia.assert<IShoppingMallProduct>(productB);
  TestValidator.equals(
    "product B code should match request",
    productB.code,
    productCodeB,
  );

  // 3. Under product A, create an option type (e.g., COLOR)
  const optionTypeNameA = "COLOR-A";
  const optionTypeCreateA = {
    name: optionTypeNameA,
    display_name: "Color A",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionTypeA: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productA.code,
        body: optionTypeCreateA,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionTypeA);

  // We treat the option type "code" as its name for assignment purposes
  const productOptionTypeCodeA = optionTypeA.name;

  // 4. Under that option type, create an option value (e.g., BLUE)
  const optionValueCodeA = "BLUE-A";
  const optionValueCreateA = {
    value: optionValueCodeA,
    display_name: "Blue A",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueA: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productA.code,
        productOptionTypeId: optionTypeA.id,
        body: optionValueCreateA,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValueA);
  TestValidator.equals(
    "option value A value should match request",
    optionValueA.value,
    optionValueCodeA,
  );

  const productOptionValueCodeA = optionValueA.value;

  // 5. Under product B, create a SKU skuCodeB
  const skuCodeB = `SKU-B-${RandomGenerator.alphaNumeric(6)}`;
  const skuCreateB = {
    code: skuCodeB,
    name: `SKU B ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productB.code,
      body: skuCreateB,
    });
  typia.assert<IShoppingMallProductSku>(skuB);
  TestValidator.equals("SKU B code should match request", skuB.code, skuCodeB);

  // 6. Attempt to assign product A's option value to product B's SKU
  const invalidAssignmentBody = {
    productOptionTypeCode: productOptionTypeCodeA,
    productOptionValueCode: productOptionValueCodeA,
    orderIndex: null,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  await TestValidator.error(
    "reject foreign product option value assignment",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
        connection,
        {
          productCode: productB.code,
          skuCode: skuB.code,
          body: invalidAssignmentBody,
        },
      );
    },
  );
}
