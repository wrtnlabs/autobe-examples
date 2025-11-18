import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Ensure product image listing returns an empty, but valid, page when a product
 * has no images.
 *
 * Business flow:
 *
 * 1. Publicly register a seller account via /auth/seller/join, obtaining an
 *    authenticated seller.
 * 2. As that seller, create a product via /shoppingMall/seller/products without
 *    attaching any images.
 * 3. Construct an unauthenticated connection (no Authorization header).
 * 4. From the unauthenticated client, call PATCH
 *    /shoppingMall/products/{productId}/images with a
 *    IShoppingMallProductImage.IRequest body specifying page and pageSize.
 * 5. Validate that the response is a well-formed
 *    IPageIShoppingMallProductImage.ISummary with zero records and an empty
 *    data array, and that pagination metadata is consistent with an empty
 *    dataset.
 */
export async function test_api_product_images_list_for_product_with_no_images(
  connection: api.IConnection,
) {
  // 1. Seller joins to obtain an authenticated seller context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shoppingmall.example.com/seller/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. As seller, create a product without any images.
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create an unauthenticated connection by dropping headers.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Call product images listing for the product, expecting an empty result set.
  const pageSize = 20 as const;
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: pageSize as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: undefined,
    sortDirection: undefined,
    visibleOnly: true,
    primaryOnly: undefined,
  } satisfies IShoppingMallProductImage.IRequest;

  const pageResult: IPageIShoppingMallProductImage.ISummary =
    await api.functional.shoppingMall.products.images.index(unauthenticated, {
      productId: product.id,
      body: requestBody,
    });
  typia.assert<IPageIShoppingMallProductImage.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 5. Validate pagination for an empty dataset and that data array is empty.
  TestValidator.equals(
    "image listing pagination.current should equal requested page for empty dataset",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "image listing pagination.limit should equal requested pageSize for empty dataset",
    pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "image listing pagination.records should be 0 when product has no images",
    pagination.records,
    0,
  );
  TestValidator.equals(
    "image listing pagination.pages should be 0 when product has no images",
    pagination.pages,
    0,
  );
  TestValidator.equals(
    "image listing data array should be empty when product has no images",
    pageResult.data,
    [],
  );
}
