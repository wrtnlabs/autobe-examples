import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Verify that platform-admin product deletion is rejected when no auth token is
 * provided.
 *
 * Business goal: Ensure that the DELETE
 * /shoppingMall/platformAdmin/products/{productCode} endpoint is protected by
 * platform-admin authentication and that an unauthenticated connection cannot
 * successfully delete a product.
 *
 * High-level steps:
 *
 * 1. Bootstrap a platform admin via POST /auth/platformAdmin/join so that we have
 *    an authenticated connection context with a valid Authorization token.
 * 2. As that platform admin, create minimal catalog data via:
 *
 *    - POST /shoppingMall/platformAdmin/brands to create a brand.
 *    - POST /shoppingMall/platformAdmin/products to create a product whose code we
 *         will later try to delete.
 * 3. Derive an unauthenticated connection object whose headers are an empty
 *    object, guaranteeing that no Authorization header is sent.
 * 4. Using this unauthenticated connection, call
 *    api.functional.shoppingMall.platformAdmin.products.erase with the
 *    productCode from step 2, and assert that it throws using
 *    TestValidator.error (without asserting a specific HTTP status code).
 * 5. Since no read/list endpoint is provided in the SDK list, we cannot re-fetch
 *    the product to assert persistence, but the core requirement for this
 *    scenario is satisfied by verifying that the unauthenticated erase call
 *    fails.
 */
export async function test_api_platform_admin_product_delete_unauthorized_without_token(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform admin to obtain an authenticated context.
  const adminJoinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a brand that will be associated with the product.
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: undefined,
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Create a product owned by some seller, optionally linked to the brand.
  //
  // We don't have a seller-creation API in the provided SDK list, so for the
  // seller foreign key we must rely on a UUID-shaped value. The backend will
  // own validating whether the seller exists; this test focuses on auth
  // enforcement on DELETE, not on seller existence.
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: `P-${RandomGenerator.alphaNumeric(10)}` as string & tags.MinLength<1>,
    name: `Product ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: null,
    description: null,
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  // Sanity assertion: ensure we have a non-empty product code.
  TestValidator.predicate(
    "created product code must be non-empty",
    () => product.code.length > 0,
  );

  // 4. Create an unauthenticated connection by clearing headers.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt to delete the product without any Authorization header.
  await TestValidator.error(
    "unauthenticated product delete must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.erase(
        unauthConnection,
        {
          productCode: product.code,
        },
      );
    },
  );
}
