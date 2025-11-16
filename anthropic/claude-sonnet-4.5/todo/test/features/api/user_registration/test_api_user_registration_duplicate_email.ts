import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test duplicate email validation during user registration.
 *
 * This test validates that the system properly enforces the unique email
 * constraint in the todo_list_users table. When a user attempts to register
 * with an email that already exists, the system must reject the registration
 * attempt with an appropriate error, preventing duplicate user accounts.
 *
 * Test workflow:
 *
 * 1. Register first user with a specific email address - should succeed
 * 2. Validate the first registration response
 * 3. Attempt to register second user with the same email but different password -
 *    should fail
 * 4. Verify that the duplicate registration is properly rejected
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate test data with a specific email to test uniqueness constraint
  const testEmail = typia.random<string & tags.Format<"email">>();
  const baseHref = typia.random<string & tags.Format<"uri">>();
  const baseReferrer = typia.random<string & tags.Format<"uri">>();

  // First registration - should succeed
  const firstUserBody = {
    email: testEmail,
    password: "firstPassword123",
    href: baseHref,
    referrer: baseReferrer,
  } satisfies ITodoListUser.ICreate;

  const firstUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: firstUserBody,
    });
  typia.assert(firstUser);

  // Validate that the first user was created successfully
  TestValidator.equals("first user email matches", firstUser.email, testEmail);
  TestValidator.predicate("first user has valid ID", firstUser.id.length > 0);
  TestValidator.predicate(
    "first user has token",
    firstUser.token.access.length > 0,
  );

  // Second registration attempt with same email but different password - should fail
  const secondUserBody = {
    email: testEmail,
    password: "differentPassword456",
    href: baseHref,
    referrer: baseReferrer,
  } satisfies ITodoListUser.ICreate;

  // Verify that duplicate email registration fails
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.user.join(connection, {
      body: secondUserBody,
    });
  });
}
