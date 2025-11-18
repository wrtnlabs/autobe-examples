import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test logout rejection when request does not include valid JWT token.
 *
 * This test validates that the logout endpoint properly rejects requests
 * without valid JWT authentication. The endpoint is a protected operation that
 * requires a valid Authorization header with a JWT token. Requests without
 * authentication or with invalid/malformed tokens should be rejected.
 *
 * Test flow:
 *
 * 1. Create a user account to establish authentication context
 * 2. Attempt logout with invalid/missing authentication token
 * 3. Verify request is rejected with unauthorized error
 * 4. Confirm logout is a protected endpoint requiring valid authentication
 */
export async function test_api_user_logout_without_auth(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to establish authentication context
  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(newUser);

  // Step 2: Create connection without authentication token (empty headers)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Attempt logout without valid authentication token
  // Should throw error because logout requires valid JWT token
  await TestValidator.error(
    "logout without authentication should fail",
    async () => {
      await api.functional.todoList.user.auth.user.logout(unauthConnection);
    },
  );
}
