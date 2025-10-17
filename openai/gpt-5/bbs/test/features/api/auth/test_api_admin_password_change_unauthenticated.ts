import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Ensure unauthenticated admin password change is rejected.
 *
 * This test validates the authentication boundary of the admin password change
 * endpoint. When no Authorization is present, the server must reject the
 * request with 401 Unauthorized.
 *
 * Steps
 *
 * 1. Create an unauthenticated connection by cloning the incoming connection and
 *    setting headers to an empty object (allowed pattern).
 * 2. Build a valid IEconDiscussAdmin.IChangePassword body.
 * 3. Call changePassword with the unauthenticated connection.
 * 4. Assert an HTTP 401 error using TestValidator.httpError.
 */
export async function test_api_admin_password_change_unauthenticated(
  connection: api.IConnection,
) {
  // 1) Unauthenticated connection (allowed pattern: create empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Valid request body for password change
  const body = {
    current_password: RandomGenerator.alphaNumeric(12),
    new_password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconDiscussAdmin.IChangePassword;

  // 3,4) Expect 401 Unauthorized when unauthenticated
  await TestValidator.httpError(
    "unauthenticated admin password change must return 401",
    401,
    async () =>
      await api.functional.auth.admin.password.changePassword(unauthConn, {
        body,
      }),
  );
}
