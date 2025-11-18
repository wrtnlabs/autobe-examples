import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test failed registration for a user when the provided email address already
 * exists in the system.
 *
 * Attempt two subsequent registrations with the same email. The first
 * registration should succeed, triggering standard flows. The second attempt,
 * using the same email, must fail with a relevant error message indicating
 * email uniqueness violation and must NOT create a new user record or trigger a
 * new verification email.
 *
 * This validates strict unique constraint enforcement and duplicate account
 * prevention.
 */
export async function test_api_todo_list_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Prepare unique email for registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://app.example.com/signup";
  const referrer = "https://app.example.com/landing";
  const display_name = RandomGenerator.name();

  // First registration: should succeed
  const result = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: password satisfies string as string,
      href,
      referrer,
      display_name,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(result);
  TestValidator.equals("registered email matches", result.email, email);
  TestValidator.equals(
    "display name matches",
    result.display_name,
    display_name,
  );
  TestValidator.predicate(
    "token has access string",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO",
    typeof result.created_at === "string" &&
      !isNaN(Date.parse(result.created_at)),
  );

  // Second registration with same email: should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email,
          password: password satisfies string as string,
          href,
          referrer,
          display_name,
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
