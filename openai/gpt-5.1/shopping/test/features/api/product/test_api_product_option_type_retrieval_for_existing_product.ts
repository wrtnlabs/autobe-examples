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

export async function test_api_product_option_type_retrieval_for_existing_product(
  connection: api.IConnection,
) {
  /**
   * 1. Prepare actors: platform admin and seller.
   *
   *    - Platform admin: required to exercise the brand creation dependency.
   *    - Seller: required for product and option type creation; its token will be
   *         used implicitly by seller-scoped APIs.
   */

  // 1-1. Join a platform admin (session + tokens established automatically)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 1-2. Optionally login as the same platform admin (not strictly required
  // for this flow, but it exercises the login dependency and ensures that
  // subsequent platformAdmin calls, if any, have a fresh token.)
  const platformAdminLoginBody = {
    email: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 1-3. Join a seller (this also issues seller JWT and sets it into
  // connection.headers.Authorization via the SDK side effect.)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorizedFromJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorizedFromJoin);

  // 1-4. Explicitly login as the seller as well, to satisfy dependency and
  // confirm that seller login works with the created credentials.
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerAuthorizedFromLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedFromLogin);

  /**
   * 2. As platform admin, create a brand to use for the product's
   *    shopping_mall_brand_id. The platformAdmin.* APIs automatically use the
   *    admin token set on the connection when login/join was called.
   */

  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shoppingmall.test/logo/" + RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallBrand.ICreate;

  const createdBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(createdBrand);

  /**
   * 3. As seller, create a product associated with the seller and brand. We use
   *    sellerAuthorizedFromLogin.id as shopping_mall_seller_id.
   */

  const uniqueProductCode =
    "PROD-" +
    RandomGenerator.alphaNumeric(8) +
    "-" +
    RandomGenerator.alphaNumeric(4);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorizedFromLogin.id,
    shopping_mall_brand_id: createdBrand.id,
    code: uniqueProductCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.test/product/" +
      RandomGenerator.alphaNumeric(16),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(createdProduct);

  TestValidator.equals(
    "created product should have requested code",
    createdProduct.code,
    uniqueProductCode,
  );

  /** 4. As seller, create a product option type for the created product. */

  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color Option",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const createdOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: createdProduct.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(createdOptionType);

  TestValidator.equals(
    "created option type should have requested name",
    createdOptionType.name,
    optionTypeCreateBody.name,
  );
  TestValidator.equals(
    "created option type should have requested display_name",
    createdOptionType.display_name,
    optionTypeCreateBody.display_name,
  );
  TestValidator.equals(
    "created option type should have requested display_order",
    createdOptionType.display_order,
    optionTypeCreateBody.display_order,
  );

  /**
   * 5. Retrieve the option type via the public GET endpoint using productCode and
   *    productOptionTypeId, without performing any explicit authentication
   *    adjustments, as the endpoint is public.
   */

  const retrievedOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.products.optionTypes.at(connection, {
      productCode: createdProduct.code,
      productOptionTypeId: createdOptionType.id,
    });
  typia.assert(retrievedOptionType);

  /**
   * 6. Validate that the retrieved option type matches the created one in key
   *    business fields and that it is not soft-deleted.
   */

  TestValidator.equals(
    "retrieved option type id matches created option type id",
    retrievedOptionType.id,
    createdOptionType.id,
  );
  TestValidator.equals(
    "retrieved option type name matches created option type name",
    retrievedOptionType.name,
    createdOptionType.name,
  );
  TestValidator.equals(
    "retrieved option type display_name matches created option type display_name",
    retrievedOptionType.display_name,
    createdOptionType.display_name,
  );
  TestValidator.equals(
    "retrieved option type display_order matches created option type display_order",
    retrievedOptionType.display_order,
    createdOptionType.display_order,
  );

  TestValidator.equals(
    "retrieved option type for an active record should not be soft-deleted",
    retrievedOptionType.deleted_at,
    null,
  );
}
