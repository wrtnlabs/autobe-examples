import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate logout response structure and confirmation details.
 *
 * Tests that the logout endpoint returns a properly structured response
 * confirming successful session termination. Verifies that:
 *
 * - Logout completes successfully with success flag set to true
 * - Response message appropriately confirms single-device logout
 * - Exactly one session (current device) is affected
 * - Logout timestamp is recorded in UTC ISO 8601 format
 *
 * This test ensures users receive clear confirmation when logging out and
 * validates that the logout operation properly records when the session was
 * terminated.
 *
 * Workflow:
 *
 * 1. Register new user account (automatic authentication via JWT tokens)
 * 2. Call logout endpoint with authenticated session
 * 3. Validate logout response structure
 * 4. Verify response contains all required fields with correct values
 * 5. Confirm logout_completed_at is a valid timestamp
 */
export async function test_api_user_logout_response_confirmation(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account via registration
  const registerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registerBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Call logout endpoint with authenticated connection
  // The connection now has the authorization token from registration
  const logoutResponse: ITodoListLogoutResponse =
    await api.functional.todoList.user.auth.user.logout(connection);

  // Step 3: Validate logout response structure and type
  typia.assert(logoutResponse);

  // Step 4: Verify response field values match specification
  TestValidator.equals(
    "logout success confirmation",
    logoutResponse.success,
    true,
  );

  TestValidator.predicate(
    "logout message contains device logout confirmation",
    logoutResponse.message.toLowerCase().includes("logged out") &&
      logoutResponse.message.toLowerCase().includes("device"),
  );

  TestValidator.equals(
    "single device logout affects exactly one session",
    logoutResponse.sessions_affected,
    1,
  );

  // Step 5: Validate logout_completed_at is a valid ISO 8601 datetime
  TestValidator.predicate(
    "logout_completed_at is valid ISO 8601 datetime format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      logoutResponse.logout_completed_at,
    ),
  );

  // Step 6: Verify logout_completed_at represents recent time
  const logoutTime = new Date(logoutResponse.logout_completed_at);
  const now = new Date();
  const timeDifferenceMs = now.getTime() - logoutTime.getTime();

  TestValidator.predicate(
    "logout_completed_at timestamp is recent (within 5 seconds)",
    timeDifferenceMs >= 0 && timeDifferenceMs <= 5000,
  );
}
