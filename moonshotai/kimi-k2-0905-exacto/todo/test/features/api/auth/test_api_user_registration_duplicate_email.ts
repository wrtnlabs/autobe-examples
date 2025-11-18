import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that duplicate user registration using the same email address is
 * rejected and does not result in a new account or session tokens being
 * issued.
 *
 * 1. Register a user with unique random email and password. Capture the
 *    authorization result and tokens.
 * 2. Attempt to register another user with the same email but a different
 *    password.
 * 3. Confirm that the second registration attempt fails (an error is thrown).
 * 4. Validate that no tokens are returned and the authorized user account has not
 *    changed.
 * 5. Optionally, verify (to the extent possible) that a second account was not
 *    created for the same email.
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Register a user with a unique random email
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const createBody = { email, password } satisfies ITodoListUser.ICreate;

  const firstAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: createBody });
  typia.assert(firstAuth);

  TestValidator.equals(
    "first registration returns an authorized user",
    firstAuth.email,
    email,
  );
  TestValidator.predicate(
    "first registration user not locked",
    firstAuth.is_locked === false,
  );
  TestValidator.predicate(
    "token issued for first registration",
    typeof firstAuth.token.access === "string" &&
      firstAuth.token.access.length > 0,
  );

  // Step 2: Attempt duplicate registration with same email but different password
  const differentPassword: string = RandomGenerator.alphaNumeric(14);
  const duplicateBody = {
    email,
    password: differentPassword,
  } satisfies ITodoListUser.ICreate;

  await TestValidator.error(
    "duplicate registration with same email is rejected",
    async () => {
      await api.functional.auth.user.join(connection, { body: duplicateBody });
    },
  );

  // Step 3: Confirm that existing account has not been changed or corrupted
  // (No endpoint for user count or lookup, so cannot check user list - this step is simply a best-effort assertion)
}
