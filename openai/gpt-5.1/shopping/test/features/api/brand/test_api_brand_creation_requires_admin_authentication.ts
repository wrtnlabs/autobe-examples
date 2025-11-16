import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that brand creation requires platform admin authentication.
 *
 * Business purpose:
 *
 * - Ensure that POST /shoppingMall/platformAdmin/brands cannot be used by
 *   anonymous callers without a valid platform admin session.
 * - Demonstrate contrast between an unauthenticated call (which must fail) and an
 *   authenticated platform admin call (which must succeed) using the same kind
 *   of request payload.
 *
 * Steps:
 *
 * 1. Build a syntactically valid IShoppingMallBrand.ICreate payload.
 * 2. Derive an unauthenticated connection object that has an empty `headers` map,
 *    without mutating the original `connection`.
 * 3. Attempt to call the brand creation endpoint with the unauthenticated
 *    connection and assert that it fails using TestValidator.error.
 * 4. Join a new platform admin using POST /auth/platformAdmin/join, which will
 *    also set Authorization header on the original connection.
 * 5. Using the now-authenticated original connection, call brand creation again
 *    with a valid payload and assert success and field echo.
 */
export async function test_api_brand_creation_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Prepare a valid brand creation payload
  const unauthBrandBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallBrand.ICreate;

  // 2. Build an unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Ensure unauthenticated brand creation fails
  await TestValidator.error(
    "unauthenticated brand creation must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.brands.create(
        unauthenticatedConnection,
        {
          body: unauthBrandBody,
        },
      );
    },
  );

  // 4. Join a platform admin to obtain an authenticated context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 5. Authenticated brand creation should succeed
  const authBrandBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const created: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: authBrandBody,
    });
  typia.assert(created);

  // Basic business-level validations
  TestValidator.equals(
    "created brand name must match input name",
    created.name,
    authBrandBody.name,
  );
  TestValidator.equals(
    "created brand slug must match input slug",
    created.slug,
    authBrandBody.slug,
  );
}
