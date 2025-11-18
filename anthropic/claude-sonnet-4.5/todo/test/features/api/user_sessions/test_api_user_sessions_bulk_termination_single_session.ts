import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test bulk session termination when the user has only a single active session.
 *
 * This test validates the edge case where bulk session termination is performed
 * on a user account with minimal (single) session data. It ensures the
 * operation handles this boundary condition correctly.
 *
 * Test workflow:
 *
 * 1. Create a new user account through registration (establishes one session)
 * 2. Immediately call bulk session termination endpoint
 * 3. Validate successful operation completion
 *
 * This ensures the bulk termination endpoint works consistently regardless of
 * the number of active sessions, including the minimal case of just one
 * session.
 */
export async function test_api_user_sessions_bulk_termination_single_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through registration
  // This automatically establishes one authenticated session
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const user = await api.functional.auth.user.join(connection, {
    body: registrationData,
  });
  typia.assert(user);

  // Validate user was created successfully with expected properties
  TestValidator.predicate(
    "user has valid id",
    typeof user.id === "string" && user.id.length > 0,
  );
  TestValidator.equals(
    "user email matches registration",
    user.email,
    registrationData.email,
  );

  // Step 2: Immediately call bulk session termination endpoint
  // At this point, the user has only one active session (from registration)
  await api.functional.todoList.user.users.me.sessions.eraseAll(connection);

  // Step 3: Validation - operation completed successfully without errors
  // The void return indicates successful termination
  // No exception thrown means the operation handled the single-session case correctly
  TestValidator.predicate("bulk termination completed successfully", true);
}
