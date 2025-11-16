import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that creating a platform admin role is forbidden without
 * authentication and allowed once a platform admin session is established.
 *
 * Business intent
 *
 * - The POST /shoppingMall/platformAdmin/adminRoles endpoint must be protected so
 *   that only authenticated platformAdmin actors can create admin roles.
 * - Any unauthenticated request must fail, while an authenticated platformAdmin
 *   can successfully create a new role definition.
 *
 * Scenario
 *
 * 1. Derive an unauthenticated connection from the incoming `connection` by
 *    shallow-cloning it and assigning an empty `headers` object. This new
 *    connection represents an anonymous client with no Authorization header.
 * 2. Build a valid IShoppingMallAdminRole.ICreate payload (non-empty `code` and
 *    `name`, optional `description_text`).
 * 3. Call api.functional.shoppingMall.platformAdmin.adminRoles.create with the
 *    unauthenticated connection and expect it to fail. Use TestValidator.error
 *    with an async callback to assert that an error is thrown. Do not assert a
 *    particular HTTP status code.
 * 4. Register a new platform administrator by calling
 *    api.functional.auth.platformAdmin.join with the original `connection` and
 *    a valid IShoppingMallPlatformAdminJoin.IRequest payload (randomized email,
 *    name, password, href and referrer URIs). This causes the SDK to
 *    automatically attach an Authorization token to `connection.headers`.
 * 5. Using the now-authenticated `connection`, call
 *    api.functional.shoppingMall.platformAdmin.adminRoles.create again with
 *    another valid IShoppingMallAdminRole.ICreate payload.
 * 6. Assert that the second call succeeds by:
 *
 *    - Verifying the result type with typia.assert<IShoppingMallAdminRole>()
 *    - Using TestValidator.equals to ensure the returned `code` and `name` match the
 *         request body values, proving that a specific role was created only in
 *         the authenticated case.
 */
export async function test_api_admin_role_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Build a valid admin role creation payload for unauthenticated attempt
  const unauthRoleBody = {
    code: `UNAUTH_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  // 3. Expect unauthenticated creation to fail
  await TestValidator.error(
    "unauthenticated role creation must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.adminRoles.create(
        unauthConn,
        { body: unauthRoleBody },
      );
    },
  );

  // 4. Register and authenticate a platform admin (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(authorizedAdmin);

  // Ensure the authorized session looks active at a high level
  TestValidator.predicate(
    "platform admin must be active after join",
    () => authorizedAdmin.isActive === true,
  );

  // 5. Build a valid admin role creation payload for authenticated attempt
  const authRoleBody = {
    code: `AUTH_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  // 6. Authenticated role creation should succeed
  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: authRoleBody },
    );
  typia.assert<IShoppingMallAdminRole>(createdRole);

  // Business-level validations: ensure the created role matches the request
  TestValidator.equals(
    "created role code should match request payload",
    createdRole.code,
    authRoleBody.code,
  );
  TestValidator.equals(
    "created role name should match request payload",
    createdRole.name,
    authRoleBody.name,
  );
  TestValidator.equals(
    "created role description_text should match request payload",
    authRoleBody.description_text ?? null,
    createdRole.description_text ?? null,
  );
}
