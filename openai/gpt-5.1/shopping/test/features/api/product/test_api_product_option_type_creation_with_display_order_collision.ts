import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate creation of multiple product option types with colliding
 * display_order values.
 *
 * Business goal
 *
 * - Ensure that a seller can create more than one option type for the same
 *   product even when they share the same display_order index.
 * - Since the backend contract does not guarantee uniqueness of display_order,
 *   this test asserts that both creations succeed and that the system returns
 *   distinct option type IDs with the expected display_order persisted.
 *
 * High level steps
 *
 * 1. Register a seller account (POST /auth/seller/join); SDK attaches
 *    Authorization.
 * 2. Create a multi-SKU product as that seller (POST
 *    /shoppingMall/seller/products).
 * 3. Create the first option type for the product with display_order = 0.
 * 4. Create the second option type for the same product, different name but the
 *    same display_order = 0.
 * 5. Assert that both option type creations succeed, have display_order = 0 and
 *    different IDs, demonstrating that collisions are allowed and handled
 *    deterministically.
 */
export async function test_api_product_option_type_creation_with_display_order_collision(
  connection: api.IConnection,
) {
  // 1. Register a seller account so that subsequent seller-scoped APIs are authorized.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create a multi-SKU product owned by this seller.
  const productCode: string & tags.MinLength<1> =
    RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product code should match the requested code",
    product.code,
    productCode,
  );
  TestValidator.predicate(
    "product should be configured as multi-SKU",
    product.is_multi_sku === true,
  );

  // 3. Create the first option type with display_order = 0.
  const firstOptionBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const firstOption: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: firstOptionBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(firstOption);

  TestValidator.equals(
    "first option display_order should be 0",
    firstOption.display_order,
    0,
  );

  // 4. Create a second option type for the same product, same display_order.
  const secondOptionBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const secondOption: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: secondOptionBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(secondOption);

  // 5. Business validations around collision behavior.
  TestValidator.equals(
    "second option display_order should also be 0",
    secondOption.display_order,
    0,
  );

  TestValidator.notEquals(
    "option type IDs should be distinct even with same display_order",
    firstOption.id,
    secondOption.id,
  );

  TestValidator.predicate(
    "first option should not be soft-deleted",
    firstOption.deleted_at === null || firstOption.deleted_at === undefined,
  );

  TestValidator.predicate(
    "second option should not be soft-deleted",
    secondOption.deleted_at === null || secondOption.deleted_at === undefined,
  );
}
