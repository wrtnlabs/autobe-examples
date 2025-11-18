import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test profile retrieval with invalid or non-existent user ID. Validates that
 * the system properly handles requests for non-existent user accounts and
 * returns appropriate error responses.
 *
 * Test steps:
 *
 * 1. Create a valid user account for authentication context
 * 2. Generate random UUID that doesn't correspond to any user
 * 3. Attempt to retrieve profile with invalid user ID
 * 4. Verify proper error handling and security measures
 * 5. Test with another fabricated UUID to ensure consistency
 */
export async function test_api_user_profile_retrieval_invalid_user_id(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const testUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      href: "https://app.example.com/auth/join",
      referrer: "https://app.example.com/",
      name: RandomGenerator.name(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(testUser);

  // Step 2: Generate completely random UUID that doesn't exist
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve profile with invalid user ID
  // This should fail since no user exists with this ID
  await TestValidator.error(
    "should fail to retrieve profile for non-existent user",
    async () => {
      await api.functional.todoApp.user.users.at(connection, {
        userId: nonExistentUserId,
      });
    },
  );

  // Step 4: Generate another invalid UUID to test consistency
  const anotherInvalidId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should consistently fail for different invalid user IDs",
    async () => {
      await api.functional.todoApp.user.users.at(connection, {
        userId: anotherInvalidId,
      });
    },
  );

  // Step 5: Verify successful retrieval still works for valid user context
  const validRetrieval = await api.functional.todoApp.user.users.at(
    connection,
    {
      userId: testUser.id,
    },
  );
  typia.assert(validRetrieval);
  TestValidator.equals(
    "valid user retrieval should return correct data",
    validRetrieval.id,
    testUser.id,
  );
}
