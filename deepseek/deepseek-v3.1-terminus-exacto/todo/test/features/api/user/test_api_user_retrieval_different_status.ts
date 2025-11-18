import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval of user details through the user retrieval endpoint.
 *
 * This test validates that user details can be successfully retrieved after
 * user registration. It creates authenticated users and verifies that the
 * retrieval operation works correctly, ensuring that user data is properly
 * accessible.
 */
export async function test_api_user_retrieval_different_status(
  connection: api.IConnection,
) {
  // Set up system configuration as prerequisite for user operations
  const configuration: ITodoListConfiguration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: {
        key: "user.retrieval.test",
        value: "enabled",
        description: "Configuration for user retrieval testing",
        category: "testing",
      } satisfies ITodoListConfiguration.ICreate,
    });
  typia.assert(configuration);

  // Create multiple authenticated users for testing
  const createdUsers: ITodoListUser.IAuthorized[] = [];

  for (let i = 0; i < 3; i++) {
    // Create authenticated user
    const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(12),
        } satisfies ITodoListUser.ICreate,
      },
    );
    typia.assert(user);

    // Store the created user for later retrieval
    createdUsers.push(user);
  }

  // Retrieve each user and validate their data
  for (const createdUser of createdUsers) {
    const retrievedUser: ITodoListUser =
      await api.functional.todoList.user.users.at(connection, {
        userId: createdUser.id,
      });
    typia.assert(retrievedUser);

    // Validate that user retrieval works correctly
    TestValidator.equals(
      "retrieved user ID matches created user ID",
      retrievedUser.id,
      createdUser.id,
    );
    TestValidator.equals(
      "retrieved user email matches created user email",
      retrievedUser.email,
      createdUser.email,
    );
    TestValidator.equals(
      "retrieved user status is active",
      retrievedUser.status,
      "active",
    );

    // Validate timestamp fields exist and are properly formatted
    TestValidator.predicate(
      "created_at timestamp exists",
      typeof retrievedUser.created_at === "string",
    );
    TestValidator.predicate(
      "updated_at timestamp exists",
      typeof retrievedUser.updated_at === "string",
    );
  }

  // Validate that all created users can be retrieved successfully
  TestValidator.equals(
    "number of successfully retrieved users matches created users",
    createdUsers.length,
    3,
  );
}
