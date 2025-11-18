import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that the admin profile endpoint properly enforces authentication
 * requirements.
 *
 * This test validates the security boundary of the admin profile endpoint by
 * attempting to access it without authentication credentials. The endpoint
 * should reject unauthenticated requests to prevent unauthorized access to
 * admin account information.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection (no JWT token in headers)
 * 2. Attempt to retrieve admin profile using the unauthenticated connection
 * 3. Verify that the API rejects the request with an authentication error
 */
export async function test_api_admin_profile_authentication_required(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection by removing any existing authorization headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt to access the admin profile endpoint without authentication
  // This should fail with an authentication error
  await TestValidator.error(
    "unauthenticated access should be rejected",
    async () => {
      await api.functional.todoList.admin.admins.me.at(unauthConnection);
    },
  );
}
