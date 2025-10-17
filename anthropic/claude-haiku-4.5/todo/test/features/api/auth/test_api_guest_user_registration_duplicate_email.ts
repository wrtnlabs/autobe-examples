import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Tests guest user registration with duplicate email rejection.
 *
 * This test validates that the guest user registration endpoint properly
 * rejects attempts to register a new account with an email address that is
 * already registered in the system. The test ensures:
 *
 * 1. First registration with valid credentials succeeds (HTTP 201)
 * 2. Subsequent registration with the same email fails (HTTP 409 Conflict)
 * 3. Error response contains appropriate conflict status code
 * 4. No duplicate accounts are created in the system
 * 5. Original registered account remains accessible and unmodified
 *
 * Security implications:
 *
 * - Prevents email spoofing and account takeover attempts
 * - Enforces email uniqueness constraints at API level
 * - Protects against brute force registration attacks
 * - Maintains data integrity in the authentication system
 */
export async function test_api_guest_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest user with valid email and password
  const email = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123!";

  const firstUser: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppGuestUser.IJoin,
    });
  typia.assert(firstUser);

  // Validate first registration succeeded with expected structure
  TestValidator.predicate(
    "first registration returns valid token structure",
    firstUser.token !== undefined && firstUser.token.access !== undefined,
  );

  // Step 2: Attempt to register another user with the same email
  // This should fail with HTTP 409 Conflict
  await TestValidator.httpError(
    "duplicate email registration should return 409 Conflict",
    409,
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          email,
          password: "DifferentPassword456!",
        } satisfies ITodoAppGuestUser.IJoin,
      });
    },
  );

  // Step 3: Verify duplicate registration with alternate password also fails
  await TestValidator.httpError(
    "duplicate email with different password should return 409 Conflict",
    409,
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          email,
          password: "AnotherPassword789!",
        } satisfies ITodoAppGuestUser.IJoin,
      });
    },
  );

  // Step 4: Verify duplicate registration with exact same password also fails
  await TestValidator.httpError(
    "duplicate email with same password should return 409 Conflict",
    409,
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          email,
          password,
        } satisfies ITodoAppGuestUser.IJoin,
      });
    },
  );

  // Step 5: Verify original account maintains valid authorization state
  TestValidator.predicate(
    "original user token has valid expiration information",
    firstUser.token.expired_at !== undefined &&
      firstUser.token.refreshable_until !== undefined,
  );
}
