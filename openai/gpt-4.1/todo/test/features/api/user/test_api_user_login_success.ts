import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate successful login for a registered user with all required context
 * fields.
 *
 * The test ensures that:
 *
 * 1. A unique user is registered (join endpoint) with valid credentials and
 *    required context fields (href, referrer, ip)
 * 2. The login endpoint is called for that user using the same credentials/context
 * 3. The response contains JWT tokens, identity, and timestamps, all validated for
 *    structure
 * 4. Tokens are set and session context/auditing are logically trusted
 * 5. The returned profile corresponds to the registered account (matching email
 *    and structure)
 *
 * This covers the authentication happy-path and session context compliance. No
 * error/failure cases are exercised in this test.
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // Step 1: Prepare registration and login input data
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<100> & tags.Format<"password">
  >();
  const href = "https://example.com/join";
  const referrer = "https://test.referrer/landing";
  const ip: string | null = RandomGenerator.pick([
    typia.random<string & tags.Format<"ipv4">>(),
    typia.random<string & tags.Format<"ipv6">>(),
    null,
  ]);

  const joinBody = {
    email,
    password: password satisfies string,
    href,
    referrer,
    ip,
  } satisfies ITodoListUser.ICreate;
  const joined: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(joined);
  TestValidator.equals("join email matches", joined.email, email);

  // Step 2: Login with the registered credentials and same session context
  const loginBody = {
    email,
    password: password satisfies string,
    href,
    referrer,
    ip,
  } satisfies ITodoListUser.ILogin;
  const loginResult: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // Step 3: Verify returned user details and tokens
  TestValidator.equals("login email matches", loginResult.email, email);
  TestValidator.predicate(
    "id is non-empty",
    typeof loginResult.id === "string" && loginResult.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is iso date-time",
    typeof loginResult.created_at === "string" &&
      loginResult.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is iso date-time",
    typeof loginResult.updated_at === "string" &&
      loginResult.updated_at.includes("T"),
  );
  typia.assert<ITodoListSysMigration>(loginResult.token);
  TestValidator.predicate(
    "jwt access token is non-empty",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "jwt refresh token is non-empty",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is iso date-time",
    typeof loginResult.token.expired_at === "string" &&
      loginResult.token.expired_at.includes("T"),
  );
  TestValidator.predicate(
    "refreshable_until is iso date-time",
    typeof loginResult.token.refreshable_until === "string" &&
      loginResult.token.refreshable_until.includes("T"),
  );
}
