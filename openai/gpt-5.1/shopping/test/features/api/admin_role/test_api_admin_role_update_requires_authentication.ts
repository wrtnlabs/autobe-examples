import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that updating admin roles requires platformAdmin authentication and
 * that a properly authenticated platform admin can update role metadata
 * successfully.
 *
 * Business flow:
 *
 * 1. Bootstrap a platform admin account using POST /auth/platformAdmin/join, which
 *    also establishes an authenticated session and sets
 *    connection.headers.Authorization.
 * 2. With this authenticated connection, create an admin role via POST
 *    /shoppingMall/platformAdmin/adminRoles, capturing its `code` and baseline
 *    fields.
 * 3. Attempt to update this role using PUT
 *    /shoppingMall/platformAdmin/adminRoles/{adminRoleCode} from an
 *    unauthenticated connection (no Authorization header). The request should
 *    fail with an HTTP authorization error.
 * 4. Attempt another update from a connection that carries an obviously invalid
 *    Authorization header to simulate an invalid/expired token. This must also
 *    result in an HTTP authorization error.
 * 5. Finally, perform a valid update using the original authenticated
 *    platformAdmin connection. Confirm that:
 *
 *    - The response matches IShoppingMallAdminRole
 *    - The role `code` remains unchanged
 *    - `name` and `description_text` reflect the new values
 *    - `updated_at` has changed compared to the original `created_at`
 */
export async function test_api_admin_role_update_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform admin and authenticated session
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a baseline admin role under this authenticated admin
  const roleCode = `ROLE_${RandomGenerator.alphaNumeric(8).toUpperCase()}`;

  const createBody = {
    code: roleCode,
    name: `Role ${RandomGenerator.name(1)}`,
    description_text: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdRole);

  // 3. Prepare update payloads
  const unauthUpdateBody = {
    name: `Updated ${createdRole.name}`,
    description_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 12,
    }),
  } satisfies IShoppingMallAdminRole.IUpdate;

  const authUpdateBody = {
    name: `Final ${createdRole.name}`,
    description_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies IShoppingMallAdminRole.IUpdate;

  // 4. Unauthenticated connection: no Authorization header
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "update admin role without auth should be unauthorized",
    [401, 403],
    async () => {
      return await api.functional.shoppingMall.platformAdmin.adminRoles.update(
        unauthConnection,
        {
          adminRoleCode: createdRole.code,
          body: unauthUpdateBody,
        },
      );
    },
  );

  // 5. Connection with invalid token
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      Authorization: "Bearer invalid-token",
    },
  };

  await TestValidator.httpError(
    "update admin role with invalid token should be unauthorized",
    [401, 403],
    async () => {
      return await api.functional.shoppingMall.platformAdmin.adminRoles.update(
        invalidTokenConnection,
        {
          adminRoleCode: createdRole.code,
          body: unauthUpdateBody,
        },
      );
    },
  );

  // 6. Valid update with authenticated admin connection
  const updatedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.update(
      connection,
      {
        adminRoleCode: createdRole.code,
        body: authUpdateBody,
      },
    );
  typia.assert(updatedRole);

  // Business assertions
  TestValidator.equals(
    "role code must remain unchanged after update",
    updatedRole.code,
    createdRole.code,
  );

  TestValidator.equals(
    "role name must be updated",
    updatedRole.name,
    authUpdateBody.name,
  );

  TestValidator.equals(
    "role description_text must be updated",
    updatedRole.description_text,
    authUpdateBody.description_text,
  );

  await TestValidator.predicate(
    "updated_at must be different from created_at",
    async () => updatedRole.updated_at !== createdRole.created_at,
  );
}
