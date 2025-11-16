import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOptionValue";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate empty result and pagination behavior of product option value
 * listing.
 *
 * Business context
 *
 * - Platform admins manage brands.
 * - Sellers own products and configure option types and values for multi-SKU
 *   catalog items.
 * - The public/search endpoint PATCH
 *   /shoppingMall/products/{productCode}/optionTypes/{productOptionTypeId}/values
 *   returns a paginated list of option value summaries.
 *
 * This test ensures that when a valid product/option-type combination has no
 * option values, the search endpoint:
 *
 * - Returns a successful response.
 * - Returns an empty data array.
 * - Reports pagination.records = 0 and pagination.pages = 0.
 * - Keeps pagination.current = 0, even when the client requests a page index
 *   beyond the available range (e.g., page = 5).
 *
 * High-level steps
 *
 * 1. Join a platform admin and login.
 * 2. Join a seller and login.
 * 3. As platform admin, create a brand.
 * 4. As seller, create a product associated with the created brand.
 * 5. As seller, create an option type for that product.
 * 6. Call option values index with filters that match nothing, verifying empty
 *    result and pagination metadata.
 * 7. Call option values index again with a far out-of-range page, verifying that
 *    the API still returns a predictable empty result and consistent pagination
 *    metadata without errors.
 */
export async function test_api_product_option_values_list_handles_empty_result_set(
  connection: api.IConnection,
) {
  // 1. Join a platform admin (creates and authenticates platformAdmin actor)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Explicit login step (even though join already authenticated) to verify login flow
  const platformAdminLoginBody = {
    email: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 2. Join a seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: undefined,
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Seller login to ensure we have a stable credential path for later
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 3. As platform admin, create a brand
  // Auth switching is automatically handled by SDK when calling login/join.
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. As seller, create a product associated with the brand
  // Ensure seller authentication is active
  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReLogin);

  const productCreateBody = {
    shopping_mall_seller_id: sellerReLogin.id,
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. As seller, create an option type for that product
  const optionTypeCreateBody = {
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
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 6. Call option values index with non-matching filters on page 1
  const firstSearchBody = {
    page: 1,
    limit: 10,
    search: null,
    value: "__non_existing_option_value__",
    display_name: null,
    is_active: null,
    order_by: "display_order",
    order_direction: "asc",
  } satisfies IShoppingMallProductOptionValue.IRequest;

  const firstPage: IPageIShoppingMallProductOptionValue.ISummary =
    await api.functional.shoppingMall.products.optionTypes.values.index(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: firstSearchBody,
      },
    );
  typia.assert(firstPage);

  // Assertions for first search (expected empty result set)
  TestValidator.equals(
    "first page of option values for fresh option type has zero records",
    firstPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "first page has zero pages when there are no records",
    firstPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "first page current index is 0 when dataset is empty",
    firstPage.pagination.current,
    0,
  );
  TestValidator.equals(
    "first page data array is empty when there are no option values",
    firstPage.data.length,
    0,
  );

  // 7. Call option values index with an out-of-range page (e.g., page 5)
  const outOfRangeSearchBody = {
    page: 5,
    limit: firstSearchBody.limit,
    search: firstSearchBody.search,
    value: firstSearchBody.value,
    display_name: firstSearchBody.display_name,
    is_active: firstSearchBody.is_active,
    order_by: firstSearchBody.order_by,
    order_direction: firstSearchBody.order_direction,
  } satisfies IShoppingMallProductOptionValue.IRequest;

  const outOfRangePage: IPageIShoppingMallProductOptionValue.ISummary =
    await api.functional.shoppingMall.products.optionTypes.values.index(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: outOfRangeSearchBody,
      },
    );
  typia.assert(outOfRangePage);

  // Assertions for out-of-range search (should still be empty and consistent)
  TestValidator.equals(
    "out-of-range page has zero records for an empty dataset",
    outOfRangePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "out-of-range page still reports zero total pages when dataset is empty",
    outOfRangePage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "out-of-range page current index is 0 when dataset is empty",
    outOfRangePage.pagination.current,
    0,
  );
  TestValidator.equals(
    "out-of-range page data array is also empty",
    outOfRangePage.data.length,
    0,
  );
}
