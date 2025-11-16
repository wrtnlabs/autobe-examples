import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOptionType";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_seller_product_option_types_list_empty_result_for_product_without_options(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Register a platform admin and create a brand
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3. Re-login as seller to restore seller actor (platformAdmin.join has changed token)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerAuthorizedAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedAfterLogin);

  // 4. Create a product with no option types configured
  const productCode = RandomGenerator.alphaNumeric(16) as string &
    tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorizedAfterLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(10),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "created product code should match requested code",
    product.code,
    productCode,
  );

  // 5. Call optionTypes.index for the product with basic pagination request
  const optionTypesRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    search: undefined,
    is_active: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallProductOptionType.IRequest;

  const firstPage: IPageIShoppingMallProductOptionType.ISummary =
    await api.functional.shoppingMall.seller.products.optionTypes.index(
      connection,
      {
        productCode: product.code,
        body: optionTypesRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallProductOptionType.ISummary>(firstPage);

  // 6. Business assertions for empty result set
  const firstPagination = firstPage.pagination;

  TestValidator.equals(
    "empty option types: records should be 0",
    firstPagination.records,
    0,
  );
  TestValidator.equals(
    "empty option types: pages should be 0 when records are 0",
    firstPagination.pages,
    0,
  );
  TestValidator.equals(
    "empty option types: current page index should be 0 for empty dataset",
    firstPagination.current,
    0,
  );
  TestValidator.predicate(
    "empty option types: limit should be positive",
    firstPagination.limit > 0,
  );
  TestValidator.equals(
    "empty option types: data array should be empty",
    firstPage.data,
    [],
  );

  // 7. Optional: Request a non-first page and verify consistent empty behavior
  const secondPageRequestBody = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies IShoppingMallProductOptionType.IRequest;

  const secondPage: IPageIShoppingMallProductOptionType.ISummary =
    await api.functional.shoppingMall.seller.products.optionTypes.index(
      connection,
      {
        productCode: product.code,
        body: secondPageRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallProductOptionType.ISummary>(secondPage);

  const secondPagination = secondPage.pagination;

  TestValidator.equals(
    "second page on empty option types: records should still be 0",
    secondPagination.records,
    0,
  );
  TestValidator.equals(
    "second page on empty option types: pages should still be 0",
    secondPagination.pages,
    0,
  );
  TestValidator.equals(
    "second page on empty option types: data should still be empty",
    secondPage.data,
    [],
  );
}
