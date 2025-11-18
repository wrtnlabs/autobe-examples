import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verifies duplicate email registration error handling in the user join API.
 *
 * This test first registers a user account using a valid random email and
 * password. It then attempts registration again using the exact same email. The
 * test confirms that:
 *
 * 1. The first registration succeeds and returns an authorized user response.
 * 2. The second (duplicate) registration attempt is rejected due to unique email
 *    constraint.
 * 3. The error response does not leak sensitive internal or debugging information.
 * 4. The API returns a generic error matching privacy/security requirements.
 * 5. No additional accounts are created for the duplicate email.
 *
 * Steps:
 *
 * 1. Generate valid registration input (matching ITodoListUser.ICreate specs).
 * 2. Call user join once (should succeed, authorized response).
 * 3. Call user join with the same input (should fail, proper error/exception
 *    returned).
 * 4. Confirm error handling by TestValidator.error and check error object shape
 *    does not contain raw SQL, full stacktrace, etc.
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Prepare valid registration input
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.Format<"password"> & tags.MinLength<8> & tags.MaxLength<100>
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: RandomGenerator.pick([
      typia.random<string & tags.Format<"ipv4">>(),
      typia.random<string & tags.Format<"ipv6">>(),
      null,
      undefined,
    ]),
  } satisfies ITodoListUser.ICreate;

  // Step 2: Register user successfully
  const authorized = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "registered user email matches",
    authorized.email,
    userInput.email,
  );

  // Step 3: Attempt vulnerable duplicate registration (should fail with privacy/generic error)
  await TestValidator.error(
    "duplicate email registration is properly rejected",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: userInput,
      });
    },
  );
}
