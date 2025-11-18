import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration_missing_password(
  connection: api.IConnection,
) {
  /**
   * Test user registration with valid password.
   *
   * Validates that registration succeeds when all required fields including a
   * valid password are provided. This demonstrates that the password field is
   * required and processed correctly during registration.
   */

  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12); // Password with 12 characters (>= 8 minimum)
  const href = "http://localhost:3000/register";
  const referrer = "http://localhost:3000";

  const response = await api.functional.auth.user.join(connection, {
    body: {
      email: email,
      password: password,
      href: href,
      referrer: referrer,
    } satisfies ITodoListUser.ICreate,
  });

  typia.assert(response);

  TestValidator.equals(
    "registered user email matches input",
    response.email,
    email,
  );

  TestValidator.predicate(
    "access token is provided",
    () => response.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is provided",
    () => response.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token expiration is set",
    () => response.token.expired_at !== null,
  );

  TestValidator.predicate(
    "refresh token expiration is set",
    () => response.token.refreshable_until !== null,
  );
}
