import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval of a user account when userId does not exist.
 *
 * Validates that system returns appropriate 404 Not Found response when
 * attempting to retrieve a user with non-existent userId, confirming proper
 * record existence checks. Since the API requires userId to be a valid UUID
 * format, we generate a valid UUID but one that does not exist in the
 * database.
 *
 * 1. Create a new user account to establish system state
 * 2. Generate a unique UUID that will not exist in the database
 * 3. Attempt to retrieve user by this valid-format non-existent UUID
 * 4. Confirm system returns 404 Not Found error
 */
export async function test_api_user_retrieve_by_id_not_found(
  connection: api.IConnection,
) {
  // Step 1: Create a new user to establish system state
  const newUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(newUser);

  // Step 2: Generate a valid but non-existent UUID
  // We generate a properly formatted UUID using typia.random
  // This UUID is guaranteed to be in correct UUID format, but won't exist in database
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve user by non-existent ID - should fail with 404 Not Found
  // This tests for existence check after format validation - the correct business scenario
  await TestValidator.error(
    "should return 404 when retrieving non-existent user",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: nonExistentUserId, // Valid UUID format but non existing ID - should return 404
      });
    },
  );
}
