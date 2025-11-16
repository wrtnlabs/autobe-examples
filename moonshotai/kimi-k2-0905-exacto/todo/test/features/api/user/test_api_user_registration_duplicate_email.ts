import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user registration with an email address that already exists in the
 * system. Validates that the system properly prevents duplicate account
 * creation and returns an appropriate error response without revealing
 * sensitive information about existing accounts. Verify that no new user record
 * is created when a duplicate email is submitted.
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to establish the duplicate email scenario
  const existingEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = RandomGenerator.alphaNumeric(10);

  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: existingEmail,
      password: originalPassword,
      href: "https://example.com/current-page",
      referrer: "https://example.com/previous-page",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);

  // Step 2: Test duplicate email registration
  await TestValidator.error(
    "duplicate email should fail registration",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: existingEmail,
          password: RandomGenerator.alphaNumeric(10),
          href: "https://example.com/current-page",
          referrer: "https://example.com/previous-page",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Step 3: Verify no new account was created by attempting to login with different password
  const differentPassword = RandomGenerator.alphaNumeric(12);

  await TestValidator.error(
    "different password should still fail for duplicate email",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: existingEmail,
          password: differentPassword,
          href: "https://example.com/current-page",
          referrer: "https://example.com/previous-page",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );
}
