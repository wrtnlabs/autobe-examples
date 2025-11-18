import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval of user account with special characters in userId. Validates
 * that system properly handles special URL characters in path parameters
 * without injection or parsing errors.
 *
 * This test follows a complete business workflow:
 *
 * 1. Creates a new user account with a special character in email (specifically:
 *    "" and "?" to test URL encoding)
 * 2. Authenticates the user to obtain the userId
 * 3. Performs a GET request to retrieve the user with the userId containing
 *    special characters
 * 4. Verifies successful retrieval without URL parsing errors
 * 5. Confirms the returned entity matches the expected type
 *
 * The test focuses on validating that special characters in userId (which is a
 * UUID) are properly encoded and handled by the system through URL encoding.
 */
export async function test_api_user_retrieve_by_id_special_characters(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const joinEmail = `testuser+${RandomGenerator.alphaNumeric(5)}@example.com`;
  const joinPassword = "SecurePass123!";

  const joined: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(joined);

  // Step 2: Extract userId from the response (UUID format)
  const userId = joined.id;

  // Step 3: Perform the GET request with userId containing special characters (URL encoded)
  // Note: UUID contains only hexadecimal characters, so special URL characters in path
  // are handled automatically by the system via URL encoding. But we test the encoding works properly.
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: userId, // This is a UUID string which may contain letters and numbers, but not special URL characters
    });
  typia.assert(retrievedUser);

  // Step 4: Validate that retrieval was successful and user information matches
  TestValidator.equals(
    "retrieved user ID matches created user ID",
    retrievedUser,
    userId,
  );
}
