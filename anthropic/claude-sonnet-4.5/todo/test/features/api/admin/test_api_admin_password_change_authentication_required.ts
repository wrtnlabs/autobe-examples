import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that password update operations enforce authentication requirements.
 *
 * This test validates the security boundary of the admin password update
 * endpoint by attempting to modify account credentials without providing valid
 * authentication. The test creates an unauthenticated connection (no JWT token)
 * and verifies that the API correctly rejects the password change request,
 * preventing unauthorized credential modifications.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection without JWT access token
 * 2. Attempt to update admin password using the unauthenticated connection
 * 3. Verify that the request is rejected with appropriate authentication error
 */
export async function test_api_admin_password_change_authentication_required(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection by removing authorization headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Attempt to update password without authentication - should fail
  await TestValidator.error(
    "password update should fail without authentication",
    async () => {
      await api.functional.todoList.admin.admins.me.update(unauthConnection, {
        body: {
          current_password: typia.random<string & tags.MinLength<8>>(),
          new_password: typia.random<string & tags.MinLength<8>>(),
        } satisfies ITodoListAdmin.IUpdate,
      });
    },
  );
}
