import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";

/**
 * Validate that an administrator cannot delete their own account, and that a
 * failed self-deletion attempt does not affect the admin's ability to
 * authenticate.
 *
 * Business context:
 *
 * - DELETE /shoppingMall/admin/admins/{adminId} is a powerful governance
 *   operation for erasing administrator accounts from shopping_mall_admins.
 * - The endpoint documentation explicitly notes that it is not intended for
 *   self-service account closure and must be strictly protected.
 * - Common governance policy is that an admin should not be able to delete
 *   themselves via the same authorization context.
 *
 * This test focuses on the self-deletion restriction, which we can implement
 * with the available APIs (join, login, erase). We do NOT rely on any
 * unprovided GET/list endpoints or special "root" admin fixtures.
 *
 * Test Scenario
 *
 * 1. Create an admin (Admin A) via POST /auth/admin/join.
 *
 *    - Use a random but valid email, password, href, and referrer.
 *    - The join endpoint returns IShoppingMallAdmin.IAuthorized and sets the
 *         Authorization header for the connection.
 * 2. Attempt to delete Admin A by calling DELETE
 *    /shoppingMall/admin/admins/{adminId} with adminId equal to Admin A's id,
 *    using the same authenticated connection.
 *
 *    - This represents an admin trying to erase their own account.
 *    - The operation must fail due to governance rules preventing self-deletion.
 * 3. Assert that the erase call throws an error.
 *
 *    - Use TestValidator.error to assert that an error is raised.
 *    - Do not assert a specific HTTP status code; only that an error occurs.
 * 4. Verify that the admin account still exists by logging in again.
 *
 *    - Call POST /auth/admin/login using the same email/password.
 *    - Expect a successful IShoppingMallAdmin.IAuthorized response.
 * 5. Compare identity fields between the original join response and the login
 *    response.
 *
 *    - Assert that id and email are identical across both responses.
 *    - This shows that the self-deletion attempt did not remove or replace the admin
 *         account.
 *
 * Business rules validated:
 *
 * - Self-deletion via the erase endpoint is rejected for the current
 *   administrator.
 * - Failed erase operations do not corrupt or remove the administrator's account
 *   data.
 * - After a failed self-deletion attempt, the admin can still log in with the
 *   same credentials.
 */
export async function test_api_admin_account_delete_protected_or_self_account(
  connection: api.IConnection,
) {
  // 1. Create an admin via /auth/admin/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // set ip optionally as null to avoid extra format constraints
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Attempt self-deletion: the admin tries to erase their own account
  await TestValidator.error(
    "self admin account deletion must fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.erase(connection, {
        adminId: joinedAdmin.id,
      });
    },
  );

  // 3. Verify that the admin can still log in after the failed erase
  const loginBody = {
    email: joinedAdmin.email,
    password: joinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 4. Confirm identity consistency between join and login responses
  TestValidator.equals(
    "admin id should remain the same after failed self-deletion",
    loggedInAdmin.id,
    joinedAdmin.id,
  );
  TestValidator.equals(
    "admin email should remain the same after failed self-deletion",
    loggedInAdmin.email,
    joinedAdmin.email,
  );
}
