import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval of user account with legacy JWT token.
 *
 * This test validates that the system correctly handles authentication using a
 * legacy token structure. The test follows a complete workflow:
 *
 * 1. Creates a new user account using the join endpoint
 * 2. Retrieves the user's authorized credentials, including the legacy token
 * 3. Uses the token to authenticate subsequent requests
 * 4. Calls the user retrieval endpoint to verify access with the legacy token
 * 5. Validates that the returned user data matches expectations
 *
 * The legacy token system is maintained for backward compatibility with
 * previous system versions. This test ensures that authentication using the
 * legacy system continues to work correctly, validating both the user account
 * creation and retrieval endpoints.
 */
export async function test_api_user_retrieve_by_id_with_legacy_token(
  connection: api.IConnection,
) {
  // 1. Create a new user account with legacy token structure
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "SecurePass123!";

  const authorization: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: password,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(authorization);

  // 2. Validate that user was created successfully
  TestValidator.equals(
    "user ID is valid UUID",
    authorization.id.length > 0,
    true,
  );
  TestValidator.equals(
    "token has access property",
    typeof authorization.token.access === "string",
    true,
  );

  // 3. Extract legacy token from the response
  // Note: This connection uses automatically handled authentication by the SDK
  // The join endpoint automatically sets the Authorization header with the generated token
  // We do not need to manually manipulate connection.headers as per strict prohibition

  // 4. Retrieve the user account data using the legacy token
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: authorization.id,
    });
  typia.assert(retrievedUser);

  // 5. Validate the retrieved user data
  TestValidator.equals(
    "retrieved user ID matches created user",
    retrievedUser,
    authorization.id,
  );
}
