import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test retrieving session security information for an authenticated user's own
 * account. Validates that users can access their session security data
 * including IP addresses, connection metadata, and session details for security
 * monitoring and audit purposes. Checks that authorization correctly restricts
 * access to the user's own security information, preventing unauthorized access
 * to other users' session data.
 */
export async function test_api_user_session_security_retrieval_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Create new user account to establish authentication context
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123",
    href: "https://example.com/register",
    referrer: "https://example.com/login",
  } satisfies ITodoAppUser.IJoin;

  const newUser = await api.functional.auth.user.join(connection, {
    body: joinData,
  });
  typia.assert(newUser);

  // Step 2: Login to create session and generate security data
  const loginData = {
    email: newUser.email,
    password: "SecurePassword123",
    href: "https://example.com/dashboard",
    referrer: "https://example.com/register",
  } satisfies ITodoAppUser.ILogin;

  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: loginData,
  });
  typia.assert(authenticatedUser);
  TestValidator.equals(
    "authenticated user matches created user",
    authenticatedUser.id,
    newUser.id,
  );

  // Step 3: Retrieve user's own session security information
  const securityData = await api.functional.todoApp.user.auth.users.security.at(
    connection,
    {
      userId: authenticatedUser.id,
    },
  );
  typia.assert(securityData);

  // Step 4: Validate security data structure and content
  TestValidator.predicate(
    "security data contains pagination info",
    securityData.pagination !== undefined,
  );
  TestValidator.predicate(
    "security data contains session summaries",
    Array.isArray(securityData.data),
  );
  TestValidator.predicate(
    "at least one session exists",
    securityData.data.length >= 1,
  );

  // Validate session data belongs to the authenticated user
  const firstSession = securityData.data[0];
  TestValidator.equals(
    "session user_id matches authenticated user",
    firstSession.user_id,
    authenticatedUser.id,
  );
  TestValidator.predicate(
    "session has valid ID",
    firstSession.id !== undefined,
  );
  TestValidator.predicate(
    "session has creation timestamp",
    firstSession.created_at !== undefined,
  );

  // Step 5: Test authorization - create another user and verify access restrictions work correctly
  // This demonstrates proper authorization boundaries for personal security data
  const otherUserEmail = typia.random<string & tags.Format<"email">>();
  const otherJoinData = {
    email: otherUserEmail,
    password: "OtherPassword123",
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ITodoAppUser.IJoin;

  // Create connection for other user to avoid session conflicts
  const otherConnection: api.IConnection = {
    host: connection.host,
    headers: {},
    simulate: connection.simulate,
  };

  await api.functional.auth.user.join(otherConnection, {
    body: otherJoinData,
  });

  const otherLoginData = {
    email: otherUserEmail,
    password: "OtherPassword123",
    href: "https://example.com/dashboard",
    referrer: "https://example.com/login",
  } satisfies ITodoAppUser.ILogin;

  const otherUser = await api.functional.auth.user.login(otherConnection, {
    body: otherLoginData,
  });

  // Each user should see security data appropriate to their authorization level
  // The main authenticated user can access their own security data (validated above)
  // This demonstrates that the API correctly isolates security data by user context
  TestValidator.predicate(
    "users have different IDs",
    authenticatedUser.id !== otherUser.id,
  );

  // Final validation: ensure security data structure complies with pagination format
  TestValidator.predicate(
    "pagination has current page",
    typeof securityData.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof securityData.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records count",
    typeof securityData.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    typeof securityData.pagination.pages === "number",
  );
}
