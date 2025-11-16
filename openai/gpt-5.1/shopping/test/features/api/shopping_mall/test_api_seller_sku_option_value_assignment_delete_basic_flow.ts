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
 * Validate basic happy-path deletion of a SKU option value assignment by a
 * seller.
 *
 * Business context:
 *
 * - Sellers manage catalog products, SKUs, and option structures (option types
 *   and values).
 * - A SKU option value assignment represents binding a concrete option value
 *   (e.g., COLOR: RED) to a specific SKU variant of a product.
 * - Sellers must be able to delete an existing assignment when reconfiguring
 *   variants.
 *
 * This test covers the minimal end-to-end flow required to reach a deletable
 * assignment and then exercise the DELETE endpoint without focusing on failure
 * cases or status codes.
 *
 * End-to-end steps:
 *
 * 1. Register a new seller with POST /auth/seller/join to establish seller auth
 *    context and ensure subsequent seller-scoped calls are authorized.
 * 2. Create a new product owned by that seller using POST
 *    /shoppingMall/seller/products with a unique business-visible product code
 *    and is_multi_sku=true so that SKU and option configuration is meaningful.
 * 3. Under that product, create a SKU using POST
 *    /shoppingMall/seller/products/{productCode}/skus with a unique skuCode and
 *    basic pricing fields.
 * 4. Under the product, create an option type using POST
 *    /shoppingMall/seller/products/{productCode}/optionTypes (e.g.,
 *    name="Color") with a deterministic display_order.
 * 5. Under the option type, create an option value using POST
 *    /shoppingMall/seller/products/{productCode}/optionTypes/{productOptionTypeId}/values
 *    (e.g., value="red") so that it can be attached to the SKU.
 * 6. Create a SKU option value assignment using POST
 *    /shoppingMall/seller/products/{productCode}/skus/{skuCode}/optionValueAssignments,
 *    referencing the option type and value via their business codes from the
 *    previous steps.
 * 7. Call DELETE
 *    /shoppingMall/seller/products/{productCode}/skus/{skuCode}/optionValueAssignments/{skuOptionValueAssignmentId}
 *    using the id returned at step 6, asserting that the call completes without
 *    throwing.
 *
 * Validation strategy:
 *
 * - Use typia.assert() on all non-void responses to guarantee DTO shape
 *   correctness.
 * - Use TestValidator.predicate() to confirm that productCode and skuCode values
 *   remain consistent across created resources where exposed.
 * - For the DELETE call, validate that no error is thrown; since no read/list
 *   endpoint for assignments is provided, absence verification is out of
 *   scope.
 */
export async function test_api_seller_sku_option_value_assignment_delete_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register seller and obtain authenticated context via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a multi-SKU product owned by this seller
  const productCode: string = `PROD-${RandomGenerator.alphaNumeric(8)}`;

  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.predicate(
    "product code matches requested code",
    product.code === productCode,
  );

  // 3. Create a SKU for the product
  const skuCode: string = `SKU-${RandomGenerator.alphaNumeric(8)}`;

  const skuBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  TestValidator.predicate(
    "SKU code matches requested code",
    sku.code === skuCode,
  );
  TestValidator.predicate(
    "SKU productCode matches parent product code",
    sku.productCode === productCode,
  );

  // 4. Create a product option type (e.g., Color)
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 5. Create an option value under that type (e.g., RED)
  const optionValueBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
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
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  // 6. Create a SKU option value assignment linking SKU to the option value
  const assignmentBody = {
    productOptionTypeCode: optionValue.optionType.name,
    productOptionValueCode: optionValue.value,
    orderIndex: 0 as number & tags.Type<"int32">,
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
  typia.assert<IShoppingMallSkuOptionValueAssignment>(assignment);

  TestValidator.predicate(
    "assignment productCode matches product",
    assignment.productCode === productCode,
  );
  TestValidator.predicate(
    "assignment skuCode matches SKU",
    assignment.skuCode === skuCode,
  );

  // 7. Delete the SKU option value assignment and ensure it completes without error
  await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.erase(
    connection,
    {
      productCode,
      skuCode,
      skuOptionValueAssignmentId: assignment.id,
    },
  );
}
