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
 * Validate creation of a product option type for a single-SKU product.
 *
 * Business goal: Ensure that an authenticated seller can create a product
 * (configured as a single-SKU product with `is_multi_sku = false`) and then
 * define a product option type (such as "Color") for that product using the
 * seller-facing option type creation API. The test verifies that the option
 * type response echoes back the requested fields and that core system-managed
 * fields are populated.
 *
 * High-level workflow:
 *
 * 1. Register a seller using /auth/seller/join and obtain an
 *    IShoppingMallSeller.IAuthorized context.
 * 2. Under this seller, create a new product via /shoppingMall/seller/products,
 *    explicitly setting `is_multi_sku = false` to represent a single-SKU
 *    product.
 * 3. For the created product, call
 *    /shoppingMall/seller/products/{productCode}/optionTypes to create a new
 *    option type with a concrete name, optional display_name, and non-negative
 *    display_order.
 * 4. Validate type correctness of responses using typia.assert.
 * 5. Assert that the option type response preserves the request fields (name,
 *    display_name, display_order) and that identifiers and timestamps are
 *    present.
 */
export async function test_api_product_option_type_creation_for_single_sku_product(
  connection: api.IConnection,
) {
  // 1. Register a new seller and obtain an authenticated context
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

  // 2. Create a single-SKU product under the authenticated seller
  const productCode: string = `sku_${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Basic consistency checks between request and product response
  TestValidator.equals(
    "product code should match request",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "product name should match request",
    product.name,
    productCreateBody.name,
  );
  TestValidator.equals(
    "product status should match request",
    product.status,
    productCreateBody.status,
  );
  TestValidator.equals(
    "product is_multi_sku should be false",
    product.is_multi_sku,
    productCreateBody.is_multi_sku,
  );

  // 3. Create a product option type for this single-SKU product
  const optionTypeRequest = {
    name: "Color",
    display_name: "Color",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeRequest,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 4. Validate that the option type fields match the request
  TestValidator.equals(
    "option type name should match request",
    optionType.name,
    optionTypeRequest.name,
  );
  TestValidator.equals(
    "option type display_name should match request",
    optionType.display_name,
    optionTypeRequest.display_name,
  );
  TestValidator.equals(
    "option type display_order should match request",
    optionType.display_order,
    optionTypeRequest.display_order,
  );

  // 5. Sanity checks on system-managed fields via type guarantees
  // typia.assert has already validated id and timestamps formats, but
  // we additionally assert that id is not an empty string to ensure
  // it was populated.
  TestValidator.predicate(
    "option type id should be a non-empty string",
    optionType.id.length > 0,
  );
}
