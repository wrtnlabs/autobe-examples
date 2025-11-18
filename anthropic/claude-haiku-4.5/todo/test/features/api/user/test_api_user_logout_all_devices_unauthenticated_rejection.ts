import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that logout-all-devices endpoint rejects unauthenticated requests.
 *
 * This test validates that the logout-all-devices endpoint properly enforces
 * authentication requirements. Users cannot log out from all devices without
 * providing a valid JWT token in the Authorization header.
 *
 * Test workflow:
 *
 * 1. Create a new user account via join operation (for system initialization)
 * 2. Create an unauthenticated connection without authorization token
 * 3. Attempt to call logout-all-devices endpoint without authentication
 * 4. Verify that the endpoint rejects the request with appropriate error
 */
export async function test_api_user_logout_all_devices_unauthenticated_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to initialize the system
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create an unauthenticated connection without authorization token
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3 & 4: Attempt logout-all-devices without authentication and verify rejection
  await TestValidator.error(
    "logout-all-devices should reject unauthenticated requests",
    async () => {
      await api.functional.todoList.user.auth.user.logout_all_devices.logoutAllDevices(
        unauthConn,
      );
    },
  );
}
