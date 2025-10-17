import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Validate that admin password-change is rejected when no authentication is
 * provided.
 *
 * Business context: Changing an admin password must be allowed only for an
 * authenticated admin. This test ensures that an unauthenticated request to PUT
 * /auth/admin/password/change is rejected by the API and results in an error
 * (e.g., unauthorized/forbidden). The test does not attempt to inspect or
 * modify admin state because doing so requires authenticated access.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection by cloning the provided connection and
 *    setting headers to an empty object.
 * 2. Prepare a valid ITodoAppAdmin.IChangePassword request body (passwords satisfy
 *    minimum length constraints using typia.random).
 * 3. Call api.functional.auth.admin.password.change.changePassword with the
 *    unauthenticated connection inside an async callback passed to
 *    TestValidator.error and assert that an error is thrown.
 */
export async function test_api_admin_change_password_unauthorized_missing_token(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection (do not mutate the original)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Build a valid request body that satisfies ITodoAppAdmin.IChangePassword
  const requestBody = {
    currentPassword: typia.random<string & tags.MinLength<8>>(),
    newPassword: typia.random<string & tags.MinLength<8>>(),
  } satisfies ITodoAppAdmin.IChangePassword;

  // 3. Expect the unauthenticated request to be rejected (an error must be thrown)
  await TestValidator.error(
    "unauthenticated admin password change should be rejected",
    async () => {
      await api.functional.auth.admin.password.change.changePassword(
        unauthConn,
        {
          body: requestBody,
        },
      );
    },
  );

  // Note: Without authenticated access we cannot inspect admin account state
  // to prove no modification occurred. The fact that the request throws is the
  // test's assertion that an unauthenticated change is not allowed.
}
