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
 * Verify that a platform-admin scoped product update cannot be performed
 * without authentication.
 *
 * Business context: Platform administrators manage catalog products via
 * `/shoppingMall/platformAdmin/products/{productCode}`. These operations must
 * be protected so that no unauthenticated caller can change product definitions
 * even if they know a valid `productCode` and send a structurally valid update
 * payload.
 *
 * Test steps:
 *
 * 1. Join as a platform admin using `/auth/platformAdmin/join`, letting the SDK
 *    attach an Authorization header to the provided connection.
 * 2. Under this authenticated context, create supporting catalog data:
 *
 *    - A category tree
 *    - A brand
 *    - A product, capturing its `code` as `productCode`.
 * 3. Derive a new `unauthenticated` connection that shares host/options with the
 *    original but has an empty `headers` object (thus no Authorization header),
 *    without mutating the original connection.
 * 4. Build a syntactically valid `IShoppingMallProduct.IUpdate` payload.
 * 5. Attempt to call `PUT /shoppingMall/platformAdmin/products/{productCode}` via
 *    `api.functional.shoppingMall.platformAdmin.products.update` using the
 *    unauthenticated connection and the valid update payload.
 * 6. Use `TestValidator.error` to assert that this call fails, indicating the
 *    backend correctly rejects unauthenticated platform-admin product updates.
 *
 * This test focuses solely on the authorization behavior of the update endpoint
 * when no platform-admin token is present. It does not validate specific HTTP
 * status codes or re-read the product state.
 */
export async function test_api_platform_admin_product_update_unauthorized_without_token(
  connection: api.IConnection,
) {
  // 1. Create a platform admin session via join (auth setup for fixtures)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create catalog prerequisites under authenticated admin context
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Use typia.random for IShoppingMallProduct.ICreate so that seller/brand
  // relationships and required fields are structurally valid.
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: typia.random<IShoppingMallProduct.ICreate>(),
      },
    );
  typia.assert(product);

  // 3. Derive an unauthenticated connection by clearing headers
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Prepare a valid update payload
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    shortDescription: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    isMultiSku: true,
    primaryImageUri: typia.random<string & tags.Format<"uri">>(),
    brandId: product.brand?.id ?? null,
    additionalData: JSON.stringify({
      source: "e2e-test",
      scenario: "unauthorized-update-without-token",
    }),
  } satisfies IShoppingMallProduct.IUpdate;

  // 5. Attempt unauthorized update and assert it fails
  await TestValidator.error(
    "platformAdmin product update must fail without auth token",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.update(
        unauthenticated,
        {
          productCode: product.code,
          body: updateBody,
        },
      );
    },
  );
}
