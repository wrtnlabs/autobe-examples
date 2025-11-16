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

export async function test_api_seller_sku_option_value_assignment_delete_wrong_sku_or_product(
  connection: api.IConnection,
) {
  // 1. Register a seller to obtain authenticated context
  const sellerJoinBody = typia.random<IShoppingMallSellerJoin.IRequest>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 2. Create two products (A and B) owned by this seller
  const baseProductCreateA = typia.random<IShoppingMallProduct.ICreate>();
  const productCreateA = {
    ...baseProductCreateA,
    shopping_mall_seller_id: seller.id,
    is_multi_sku: true,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateA,
    });
  typia.assert(productA);

  const baseProductCreateB = typia.random<IShoppingMallProduct.ICreate>();
  const productCreateB = {
    ...baseProductCreateB,
    shopping_mall_seller_id: seller.id,
    is_multi_sku: true,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateB,
    });
  typia.assert(productB);

  // 3. Under product A, create option type, option value, SKU A, and assignment A
  const optionTypeCreate =
    typia.random<IShoppingMallProductOptionType.ICreate>();
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productA.code,
        body: optionTypeCreate,
      },
    );
  typia.assert(optionType);

  const optionValueCreate =
    typia.random<IShoppingMallProductOptionValue.ICreate>();
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productA.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreate,
      },
    );
  typia.assert(optionValue);

  const skuCreateA = typia.random<IShoppingMallProductSku.ICreate>();
  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productA.code,
      body: skuCreateA,
    });
  typia.assert(skuA);

  const assignmentCreateA =
    typia.random<IShoppingMallSkuOptionValueAssignment.ICreate>();
  const skuAssignmentA: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: productA.code,
        skuCode: skuA.code,
        body: {
          ...assignmentCreateA,
          productOptionTypeCode: optionType.name,
          productOptionValueCode: optionValue.value,
        } satisfies IShoppingMallSkuOptionValueAssignment.ICreate,
      },
    );
  typia.assert(skuAssignmentA);

  // 4. Under product B, create SKU B (no assignment needed)
  const skuCreateB = typia.random<IShoppingMallProductSku.ICreate>();
  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productB.code,
      body: skuCreateB,
    });
  typia.assert(skuB);

  // 5. Attempt to delete assignment A using mismatched productCode/skuCode (product B / SKU B)
  await TestValidator.error(
    "mismatched productCode/skuCode must not delete assignment",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.erase(
        connection,
        {
          productCode: productB.code,
          skuCode: skuB.code,
          skuOptionValueAssignmentId: skuAssignmentA.id,
        },
      );
    },
  );

  // 6. Now delete the assignment with the correct productCode/skuCode; this should succeed.
  await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.erase(
    connection,
    {
      productCode: productA.code,
      skuCode: skuA.code,
      skuOptionValueAssignmentId: skuAssignmentA.id,
    },
  );
}
