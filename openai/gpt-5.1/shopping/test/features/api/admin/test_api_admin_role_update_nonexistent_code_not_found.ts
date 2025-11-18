import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

/**
 * Verify that updating a non-existent admin role by its business code fails.
 *
 * Business intent:
 *
 * - The update endpoint for admin roles must behave as a pure update: it must not
 *   upsert or implicitly create roles when the target role code does not
 *   exist.
 * - When an administrator tries to update a role that is not present in the
 *   shopping_mall_admin_roles table, the backend must return a not-found style
 *   error, rather than creating a new role or returning a success payload.
 *
 * Test flow:
 *
 * 1. Join as an admin using POST /auth/admin/join to establish an authorized admin
 *    session. The SDK takes care of injecting the access token into the
 *    connection headers.
 * 2. Build a clearly unique, non-existent adminRoleCode string that should not
 *    collide with any real role codes (e.g., prefix with
 *    "nonexistent_role_code_" and add a random suffix).
 * 3. Prepare an IShoppingMallAdminRole.IUpdate payload with some candidate changes
 *    for name and description, simulating a genuine update attempt.
 * 4. Invoke api.functional.shoppingMall.admin.adminRoles.update with the
 *    non-existent adminRoleCode and the prepared body.
 * 5. Use TestValidator.error to assert that the call fails rather than returning a
 *    normal IShoppingMallAdminRole response.
 *
 * Validation rules:
 *
 * - The update() call with a non-existent adminRoleCode must throw (reject),
 *   which we treat as the not-found behavior.
 * - We do not assert the exact HTTP status code or error payload contents, only
 *   that an error occurs.
 * - We do not perform any role listing or post-condition query here because those
 *   APIs are out of scope; the fact that update() rejects for a non-existent
 *   code is the observable guarantee that no new role record was created by
 *   this call.
 */
export async function test_api_admin_role_update_nonexistent_code_not_found(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain an authorized admin context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Construct a role code that is virtually guaranteed not to exist.
  const nonexistentRoleCode = `nonexistent_role_code_${RandomGenerator.alphaNumeric(16)}`;

  // 3. Prepare an update payload with some fields populated.
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallAdminRole.IUpdate;

  // 4. Attempt to update using the non-existent role code and assert failure.
  await TestValidator.error(
    "updating non-existent admin role must fail",
    async () => {
      await api.functional.shoppingMall.admin.adminRoles.update(connection, {
        adminRoleCode: nonexistentRoleCode,
        body: updateBody,
      });
    },
  );
}
