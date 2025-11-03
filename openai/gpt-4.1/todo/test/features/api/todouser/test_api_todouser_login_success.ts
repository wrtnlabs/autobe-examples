import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";

/**
 * Validates successful login of a todoUser with correct credentials.
 *
 * This scenario covers end-to-end login authentication for an already
 * registered todoUser account. It first registers a new todoUser, then logs in
 * with the same email and password. The test ensures login succeeds, the
 * returned account data matches the registered user, JWT tokens are present,
 * and session context fields (e.g., referrer, href, and optional IP) are
 * properly handled and audited.
 *
 * Steps:
 *
 * 1. Register a todoUser with random, valid email and password, including session
 *    context (href, referrer, and IP)
 * 2. Attempt login with the same email and password, specifying identical context
 *    fields
 * 3. Validate that login returns a new authorized user object, tokens, and correct
 *    identity information
 * 4. Check properties of the JWT tokens for issuance, expiration, and refresh
 * 5. Audit context fields (referrer/href) are recorded, and all business rules are
 *    satisfied
 */
export async function test_api_todouser_login_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new todoUser
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // at least 8 chars
  const href = "https://test.example.com/register";
  const referrer = "https://test.example.com/login";
  // Use ipv4 for audit context
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const registerBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies ITodoListTodouser.IVerifyJoin;
  const registeredUser = await api.functional.auth.todoUser.join(connection, {
    body: registerBody,
  });
  typia.assert(registeredUser);

  // Step 2: Login with the same credentials, audit context
  const loginBody = {
    email,
    password,
    href: "https://test.example.com/login-flow", // simulate login page
    referrer: "https://test.example.com/home", // simulate external referrer
    ip,
  } satisfies ITodoListTodouser.IVerifyLogin;
  const loginUser = await api.functional.auth.todoUser.login(connection, {
    body: loginBody,
  });
  typia.assert(loginUser);

  // Step 3: Validate identity
  TestValidator.equals(
    "todoUser id matches after login",
    loginUser.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "todoUser email matches after login",
    loginUser.email,
    email,
  );

  // Step 4: JWT token presence
  TestValidator.predicate(
    "login response has a token with access and refresh",
    typeof loginUser.token.access === "string" &&
      typeof loginUser.token.refresh === "string" &&
      typeof loginUser.token.expired_at === "string" &&
      typeof loginUser.token.refreshable_until === "string",
  );

  // Step 5: Audit timestamps are valid ISO format
  TestValidator.predicate(
    "created_at and updated_at are ISO strings",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(loginUser.created_at) &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(loginUser.updated_at),
  );
}
