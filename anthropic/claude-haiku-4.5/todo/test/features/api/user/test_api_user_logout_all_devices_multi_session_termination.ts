import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_logout_all_devices_multi_session_termination(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account to establish initial session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123";

  const initialUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(initialUser);

  // Step 2: Verify user registration succeeded
  TestValidator.predicate(
    "user should be created with valid ID",
    initialUser.id !== null,
  );
  TestValidator.equals(
    "registered user email should match",
    initialUser.email,
    userEmail,
  );

  // Step 3: Perform global logout from all devices
  // This terminates all active sessions for the authenticated user
  const logoutResponse: ITodoListLogoutResponse =
    await api.functional.todoList.user.auth.user.logout_all_devices.logoutAllDevices(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 4: Verify logout was successful
  TestValidator.predicate(
    "logout should return success true",
    logoutResponse.success === true,
  );

  // Step 5: Verify logout message indicates global logout
  TestValidator.predicate(
    "message should indicate global logout from all devices",
    logoutResponse.message.toLowerCase().includes("all devices"),
  );

  // Step 6: Verify at least one session was terminated (the registration session)
  TestValidator.predicate(
    "sessions_affected should be at least 1",
    logoutResponse.sessions_affected >= 1,
  );

  // Step 7: Verify logout completion timestamp is valid ISO 8601 format
  TestValidator.predicate(
    "logout_completed_at should be valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      logoutResponse.logout_completed_at,
    ),
  );

  // Step 8: Verify response contains all required fields
  TestValidator.predicate(
    "response should have complete structure",
    logoutResponse.success !== undefined &&
      logoutResponse.message !== undefined &&
      logoutResponse.sessions_affected !== undefined &&
      logoutResponse.logout_completed_at !== undefined,
  );
}
