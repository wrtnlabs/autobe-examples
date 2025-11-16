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
 * Verify that a seller cannot create a product option type for a product they
 * do not own.
 *
 * Business goal: Ensure that the option type creation endpoint is
 * ownership-aware and prevents cross-tenant modifications. Only the owning
 * seller of a product should be able to define option types for that product.
 * Attempts by other sellers must fail with an authorization-related HTTP error,
 * while the owning seller can succeed.
 *
 * High-level flow implemented in this test:
 *
 * 1. Register a platform admin and create a brand for catalog realism.
 * 2. Register Seller A (the owning seller) via /auth/seller/join.
 * 3. As Seller A, create a multi-SKU product associated with the brand.
 * 4. Register Seller B via /auth/seller/join (SDK switches Authorization).
 * 5. As Seller B, attempt to create an option type for Seller A's product; expect
 *    an HTTP authorization error.
 * 6. Log back in as Seller A.
 * 7. As Seller A, successfully create an option type on the same product.
 *
 * This combination validates that:
 *
 * - Ownership is checked when creating product option types.
 * - The same payload that fails for a non-owner succeeds for the owner.
 */
export async function test_api_product_option_type_creation_by_different_seller_forbidden(
  connection: api.IConnection,
) {
  // 1. Register a platform admin so we can create a brand.
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platform admin.
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register Seller A (owning seller).
  const sellerAPassword = RandomGenerator.alphaNumeric(12);
  const sellerAEmail = typia.random<string & tags.Format<"email">>();

  const sellerAJoinBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerA);

  // 4. As Seller A, create a multi-SKU product associated with the brand.
  const productCode = "CODE-" + RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerA.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(10),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product code should match the requested code",
    product.code,
    productCode,
  );

  // 5. Register Seller B (unauthorized seller for this product).
  const sellerBPassword = RandomGenerator.alphaNumeric(12);
  const sellerBEmail = typia.random<string & tags.Format<"email">>();

  const sellerBJoinBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerB);

  // 6. As Seller B, attempt to create an option type for Seller A's product.
  const unauthorizedOptionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  await TestValidator.httpError(
    "different seller must not be able to create option type for foreign product",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.seller.products.optionTypes.create(
        connection,
        {
          productCode: product.code,
          body: unauthorizedOptionTypeBody,
        },
      );
    },
  );

  // 7. Log back in as Seller A.
  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerARelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerARelogin);

  // 8. As Seller A, successfully create an option type for the same product.
  const authorizedOptionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: 1,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: authorizedOptionTypeBody,
      },
    );
  typia.assert(optionType);

  TestValidator.equals(
    "authorized option type name should match request",
    optionType.name,
    authorizedOptionTypeBody.name,
  );
  TestValidator.equals(
    "authorized option type display_order should match request",
    optionType.display_order,
    authorizedOptionTypeBody.display_order,
  );
}
