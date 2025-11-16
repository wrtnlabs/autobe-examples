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

export async function test_api_sku_option_value_assignment_update_invalid_cross_product_value(
  connection: api.IConnection,
) {
  // 1. Register a seller account to obtain an authenticated seller context.
  const sellerRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerRequestBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create two products (A and B) for this seller.
  const baseProductCodeA = `PROD-A-${RandomGenerator.alphaNumeric(8)}`;
  const baseProductCodeB = `PROD-B-${RandomGenerator.alphaNumeric(8)}`;

  const productACreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: null,
    code: baseProductCodeA,
    name: `Product A ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  const productBCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: null,
    code: baseProductCodeB,
    name: `Product B ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBCreateBody,
    });
  typia.assert<IShoppingMallProduct>(productB);

  // 3. For product A, create an option type (COLOR) and an option value (RED).
  const optionTypeACreateBody = {
    name: "COLOR",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionTypeA: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productA.code,
        body: optionTypeACreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionTypeA);

  const optionValueARedCreateBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueARed: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productA.code,
        productOptionTypeId: optionTypeA.id,
        body: optionValueARedCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValueARed);

  // 4. For product B, create an option type (COLOR) and an option value (BLUE).
  const optionTypeBCreateBody = {
    name: "COLOR",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionTypeB: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productB.code,
        body: optionTypeBCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionTypeB);

  const optionValueBBlueCreateBody = {
    value: "BLUE",
    display_name: "Blue",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueBBlue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productB.code,
        productOptionTypeId: optionTypeB.id,
        body: optionValueBBlueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValueBBlue);

  // 5. Create a SKU under product B.
  const skuCreateBody = {
    code: `SKU-B-${RandomGenerator.alphaNumeric(8)}`,
    name: `SKU for B ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productB.code,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(skuB);

  // 6. Create an assignment for product B SKU pointing to BLUE.
  const assignmentCreateBody = {
    productOptionTypeCode: optionTypeB.name,
    productOptionValueCode: optionValueBBlue.value,
    orderIndex: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const assignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: productB.code,
        skuCode: skuB.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuOptionValueAssignment>(assignment);

  TestValidator.equals(
    "initial assignment uses BLUE value of product B",
    assignment.productOptionValueCode,
    optionValueBBlue.value,
  );

  // 7. Attempt to update the assignment to point to RED from product A.
  //    This must fail as a cross-product assignment is not allowed.
  const updateBody: IShoppingMallSkuOptionValueAssignment.IUpdate = {
    product_option_value_id: optionValueARed.id,
  };

  await TestValidator.error(
    "cross-product SKU option value update must fail",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.update(
        connection,
        {
          productCode: productB.code,
          skuCode: skuB.code,
          skuOptionValueAssignmentId: assignment.id,
          body: updateBody,
        },
      );
    },
  );

  // 8. Local invariant: our original assignment object must still represent
  //    the BLUE value; we never mutated it locally, and the failed update must
  //    not trick us into thinking it changed to RED.
  TestValidator.equals(
    "assignment in local state remains bound to BLUE value",
    assignment.productOptionValueCode,
    optionValueBBlue.value,
  );
}
