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
 * Ensure that a seller cannot delete SKU option value assignments belonging to
 * another seller's product.
 *
 * Business flow (adapted to available APIs):
 *
 * 1. Join as seller S1 and obtain authenticated context via /auth/seller/join.
 * 2. Under S1, create a multi-SKU product via /shoppingMall/seller/products.
 * 3. Under S1, create a product option type for that product.
 * 4. Under S1, create a product option value under that option type.
 * 5. Under S1, create a SKU for the product.
 * 6. Under S1, create a SKU option value assignment linking the SKU to the option
 *    value.
 * 7. Join as a different seller S2 (this overwrites the connection's Authorization
 *    header).
 * 8. As S2, attempt to delete the SKU option value assignment created by S1 using
 *    DELETE
 *    /shoppingMall/seller/products/{productCode}/skus/{skuCode}/optionValueAssignments/{assignmentId}.
 * 9. Verify that the delete attempt throws an error (authorization/ownership
 *    violation).
 *
 * Notes and limitations:
 *
 * - The SDK only exposes a join endpoint for sellers; there is no
 *   login/impersonation function that would allow switching back to the same S1
 *   after joining S2. Therefore, we limit the test to negative access control
 *   (S2 cannot delete S1's assignment) and do not attempt a subsequent positive
 *   delete by the original owner.
 * - There is no GET endpoint for SKU option value assignments provided, so we
 *   cannot re-fetch the assignment after S2's failed delete. We rely on the API
 *   contract that a failed authorization must not delete the record.
 */
export async function test_api_seller_sku_option_value_assignment_delete_access_control_same_seller_only(
  connection: api.IConnection,
) {
  // 1. Join as seller S1
  const s1JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: s1JoinBody,
    });
  typia.assert(seller1);

  // 2. Under S1, create a multi-SKU product
  const productCode: string = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: seller1.id,
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
  typia.assert(product);
  TestValidator.equals(
    "created product code should match input",
    product.code,
    productCode,
  );
  TestValidator.equals(
    "created product seller should match S1",
    product.seller.id,
    seller1.id,
  );

  // 3. Create a product option type for S1's product
  const optionTypeCreateBody = {
    name: "Color",
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

  // 4. Create a product option value under the option type
  const optionValueCreateBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 5. Create a SKU under S1's product
  const skuCode: string = RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} - Red`,
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
    "created SKU code should match input",
    sku.code,
    skuCode,
  );
  TestValidator.equals(
    "SKU should belong to created product",
    sku.productCode,
    product.code,
  );

  // 6. Create a SKU option value assignment under S1
  const assignmentCreateBody = {
    productOptionTypeCode: optionType.name,
    productOptionValueCode: optionValue.value,
    orderIndex: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;
  const assignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "assignment productCode matches product",
    assignment.productCode,
    product.code,
  );
  TestValidator.equals(
    "assignment skuCode matches sku",
    assignment.skuCode,
    sku.code,
  );

  // 7. Join as a second seller S2 (switches Authorization on connection)
  const s2JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: s2JoinBody,
    });
  typia.assert(seller2);
  TestValidator.notEquals(
    "S2 must be a different seller from S1",
    seller2.id,
    seller1.id,
  );

  // 8. As S2, attempt to delete S1's SKU option value assignment and expect failure
  await TestValidator.error(
    "cross-seller cannot delete another seller's SKU option value assignment",
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
