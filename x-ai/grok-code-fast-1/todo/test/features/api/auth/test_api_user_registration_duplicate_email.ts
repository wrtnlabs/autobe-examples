import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate registration endpoint enforces unique email constraint.
 *
 * This test ensures that a user's email address cannot be registered more than
 * once. It:
 *
 * 1. Registers a new user using a random, valid email address.
 * 2. Attempts to register a second user with the exact same email but different
 *    password, display_name, href, and referrer.
 * 3. Asserts that the second registration fails with an appropriate duplicate
 *    email error.
 * 4. (If possible) Ensures that only one account exists for the target email,
 *    trusting backend enforcement for unique constraint.
 *
 * Steps:
 *
 * - Step 1: Register user with random valid email and details (using
 *   ITodoListUser.IJoin)
 * - Step 2: Re-attempt registration with same email and new valid details
 *   (ITodoListUser.IJoin)
 * - Step 3: Assert that second registration is rejected
 * - Step 4: (If supported by API) Confirm only one registration exists for email
 *   (otherwise skip)
 *
 * This guarantees that registration endpoint prohibits duplicate email and no
 * new users are created in that case.
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate a unique valid email for the test
  const email = typia.random<string & tags.Format<"email">>();

  // Step 1: Register the initial user
  const initialJoin = {
    email,
    password: RandomGenerator.alphaNumeric(12) + "aA1", // ensure mix
    display_name: RandomGenerator.name(2),
    href: "https://" + RandomGenerator.alphaNumeric(8) + ".test/join",
    referrer: "https://" + RandomGenerator.alphaNumeric(6) + ".test/home",
  } satisfies ITodoListUser.IJoin;
  const initialResult = await api.functional.auth.user.join(connection, {
    body: initialJoin,
  });
  typia.assert(initialResult);
  TestValidator.equals(
    "registered email matches input",
    initialResult.email,
    email,
  );
  TestValidator.equals(
    "registered display_name matches input",
    initialResult.display_name,
    initialJoin.display_name,
  );

  // Step 2: Attempt duplicate registration with same email but different details
  const duplicateJoin = {
    email, // duplicate
    password: RandomGenerator.alphaNumeric(16) + "bB2", // different password
    display_name: RandomGenerator.name(3), // different display name
    href: "https://" + RandomGenerator.alphaNumeric(10) + ".test/dupreg",
    referrer: "https://" + RandomGenerator.alphaNumeric(5) + ".test/some",
  } satisfies ITodoListUser.IJoin;

  // Step 3: Assert duplicate registration fails
  await TestValidator.error(
    "duplicate email registration should be rejected",
    async () => {
      await api.functional.auth.user.join(connection, { body: duplicateJoin });
    },
  );

  // Step 4: (If enumeration possible, otherwise skip)
  // No API for listing users by email, so no further direct validation possible
}
