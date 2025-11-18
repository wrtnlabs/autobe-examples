import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user retrieval with a non-existent email address.
 *
 * This test validates that the API properly handles requests for non-existent
 * users by returning appropriate error responses. The scenario involves:
 *
 * 1. Creating an authenticated user account for context
 * 2. Generating a non-existent email address
 * 3. Attempting to retrieve user information with the non-existent email
 * 4. Verifying that the API correctly identifies the user doesn't exist
 */
export async function test_api_user_retrieval_nonexistent_email(
  connection: api.IConnection,
) {
  // Step 1: Create an authenticated user account for context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Generate a completely different non-existent email
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Validate that the non-existent email is truly different from the created user's email
  TestValidator.notEquals(
    "non-existent email should be different from created user email",
    nonExistentEmail,
    userEmail,
  );

  // Step 3: Attempt to retrieve user with non-existent email
  await TestValidator.error(
    "retrieving non-existent user should fail",
    async () => {
      await api.functional.todoApp.user.users.at(connection, {
        userEmail: nonExistentEmail,
      });
    },
  );
}
