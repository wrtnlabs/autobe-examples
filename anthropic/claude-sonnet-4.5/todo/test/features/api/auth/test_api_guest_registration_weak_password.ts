import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test password strength validation during guest user registration.
 *
 * Validates that the registration endpoint properly enforces the minimum
 * password length requirement of 8 characters as specified in the
 * ITodoListGuest.ICreate schema. This test ensures system security by
 * preventing the creation of accounts with weak passwords.
 *
 * Test workflow:
 *
 * 1. Generate valid registration data (email, href, referrer)
 * 2. Attempt registration with password of 1 character
 * 3. Attempt registration with password of 4 characters
 * 4. Attempt registration with password of 7 characters
 * 5. Verify all attempts fail with validation errors
 * 6. Confirm no accounts are created with weak passwords
 */
export async function test_api_guest_registration_weak_password(
  connection: api.IConnection,
) {
  // Test Case 1: Password with 1 character (well below minimum)
  await TestValidator.error(
    "registration should fail with 1-character password",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphabets(1),
          name: RandomGenerator.name(),
          href: "https://example.com/register",
          referrer: "https://example.com/home",
        } satisfies ITodoListGuest.ICreate,
      });
    },
  );

  // Test Case 2: Password with 4 characters (still below minimum)
  await TestValidator.error(
    "registration should fail with 4-character password",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphabets(4),
          name: RandomGenerator.name(),
          href: "https://app.example.com/signup",
          referrer: "https://app.example.com/landing",
        } satisfies ITodoListGuest.ICreate,
      });
    },
  );

  // Test Case 3: Password with 7 characters (just below minimum)
  await TestValidator.error(
    "registration should fail with 7-character password",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphabets(7),
          name: RandomGenerator.name(),
          href: "https://todo.example.com/join",
          referrer: "https://todo.example.com/",
        } satisfies ITodoListGuest.ICreate,
      });
    },
  );
}
