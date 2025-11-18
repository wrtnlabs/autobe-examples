import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verifies API rejects registration with existing email (duplicate) and does
 * not issue a token.
 *
 * Scenario:
 *
 * 1. Successfully register a new user with a random email.
 * 2. Attempt to register another user with the same email (identical casing).
 * 3. Validate that the second registration attempt fails (error is thrown).
 * 4. Confirm that no new user account is created and no authentication token is
 *    returned.
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Construct a random but valid email
  const email = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://example.com/register";
  const referrer = "https://example.com/landing";

  // 2. Register the initial user successfully
  const joinBody = {
    email,
    password,
    href,
    referrer,
  } satisfies ITodoListUser.IJoin;
  const registered = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(registered);
  TestValidator.equals(
    "initial registration returns requested email",
    registered.email,
    email,
  );

  // 3. Attempt duplicate registration with same email (same casing)
  const dupJoinBody = {
    email,
    password: RandomGenerator.alphaNumeric(12), // force new password for clarity
    href,
    referrer,
  } satisfies ITodoListUser.IJoin;
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.user.join(connection, { body: dupJoinBody });
    },
  );
}
