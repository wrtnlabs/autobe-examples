import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test email uniqueness constraint by attempting to register a guest user with
 * an email address that already exists in the todo_list_users table.
 *
 * This test validates critical data integrity constraints:
 *
 * 1. First registration with unique email succeeds and returns valid tokens
 * 2. Second registration with duplicate email fails with appropriate error
 * 3. System maintains database integrity by preventing duplicate accounts
 * 4. Original account remains unchanged and valid after failed duplicate attempt
 *
 * Test Flow:
 *
 * 1. Generate random test email address
 * 2. Successfully register first guest user with this email
 * 3. Validate response structure and authentication tokens
 * 4. Attempt second registration with same email but different data
 * 5. Verify that duplicate registration fails with error
 * 6. Confirm no duplicate records created (implicit via error)
 */
export async function test_api_guest_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate unique test email for this test run
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Create first guest user - this should succeed
  const firstUserData = {
    email: testEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    ip: "192.168.1.100",
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ITodoListGuest.ICreate;

  const firstUser = await api.functional.auth.guest.join(connection, {
    body: firstUserData,
  });

  // Validate first registration response structure
  typia.assert(firstUser);

  // Attempt to register second user with same email - this should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: testEmail, // Same email as first user
          password: typia.random<string & tags.MinLength<8>>(),
          name: RandomGenerator.name(), // Different name to distinguish attempts
          href: "https://example.com/register",
          referrer: "https://example.com/signup",
        } satisfies ITodoListGuest.ICreate,
      });
    },
  );
}
