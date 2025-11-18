import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Test guest registration with duplicate email validation.
 *
 * This test verifies that the guest registration API properly enforces the
 * email uniqueness constraint. It ensures that:
 *
 * 1. A guest user can be registered with a valid email
 * 2. Attempting to register another user with the same email is rejected
 * 3. The error indicates the email is not unique
 * 4. The first user's account remains unchanged
 *
 * The test flow:
 *
 * 1. Create a first guest user with a unique email
 * 2. Attempt to create another guest user with the same email
 * 3. Verify the second registration fails with appropriate error
 * 4. Confirm the original user's data is still intact
 */
export async function test_api_guest_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create the first guest user with a unique email
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstPassword = RandomGenerator.alphabets(10);

  const firstUser: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: firstEmail,
        password: firstPassword,
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(firstUser);

  TestValidator.equals(
    "first user email should match input",
    firstUser.email,
    firstEmail,
  );
  TestValidator.predicate(
    "first user should have valid ID",
    firstUser.id.length > 0,
  );
  TestValidator.predicate(
    "first user should have authorization token",
    firstUser.token.access.length > 0,
  );

  // Step 2: Attempt to register another user with the same email
  // This should fail because the email is already in use
  const secondPassword = RandomGenerator.alphabets(10);

  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: firstEmail, // Same email as the first user
          password: secondPassword,
        } satisfies ITodoListGuest.ICreate,
      });
    },
  );

  // Step 3: Verify the original user's data is still intact
  TestValidator.predicate(
    "first user token should still be valid",
    firstUser.token.access.length > 0,
  );
  TestValidator.equals(
    "first user email should remain unchanged",
    firstUser.email,
    firstEmail,
  );
}
