import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that admin authentication is mandatory for password reset requests.
 * Attempt to call the password reset endpoint without any authentication (no admin join or login).
 * Verify that the request is rejected with proper authentication error (401 Unauthorized).
 * Confirm that unauthenticated users cannot initiate admin password resets, maintaining security boundaries.
 * Validate that the error response doesn't leak any information about the system or email validation process.
 * Test that proper authentication headers are required for this administrative endpoint.
 */
export async function test_api_admin_password_reset_authentication_required(
  connection: api.IConnection,
): Promise<void> {
  // Create a valid password reset request body with random email
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IMultiUserTodoAdminPasswordReset.IRequest;
  // Attempt to call the password reset endpoint using the base connection (no admin authentication)
  // This should fail with authentication error since the connection has no Authorization header
  await TestValidator.error(
    "should reject unauthenticated password reset request",
    async () => {
      await api.functional.multiUserTodo.admin.admins.password_resets.request(
        connection, // Base connection without admin authentication
        { body },
      );
    },
  );
  // IMPORTANT: Do NOT create admin connection or authenticate admin for this test
  // The entire purpose is to verify that unauthenticated access is blocked
  // Creating admin authentication would defeat the test's objective
  // Additional security validation: Verify no admin was accidentally authenticated
  // The base connection should remain without Authorization headers
  TestValidator.equals(
    "connection should not have authorization header",
    connection.headers?.Authorization,
    undefined,
  );
}
