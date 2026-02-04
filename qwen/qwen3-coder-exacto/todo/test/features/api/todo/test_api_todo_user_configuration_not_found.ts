import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
/**
 * Tests error handling when attempting to delete a non-existent todo
 * configuration.
 *
 * This test verifies that the system properly handles attempts to delete
 * configurations that don't exist by returning a 404 Not Found error.
 *
 * The test follows these steps:
 *
 * 1. Create a new user account through the join process
 * 2. Generate a random UUID for a non-existent configuration
 * 3. Attempt to delete the configuration with the generated UUID
 * 4. Verify that the operation throws a 404 Not Found error
 *
 * This ensures the API properly validates configuration existence before
 * attempting deletion and provides appropriate error responses for invalid
 * IDs.
 */
export async function test_api_todo_user_configuration_not_found(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through the join process
  const user = await authorize_todo_user_join(connection, {
    body: {
      email: `test-${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://todo.example.com/register",
      referrer: "https://todo.example.com",
    },
  });
  // Create a connection with the user's authentication token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${user.token.access}` },
  };
  // Step 2: Generate a random UUID for a non-existent configuration
  const nonExistentConfigurationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Attempt to delete the configuration with the generated UUID
  // Step 4: Verify that the operation throws a 404 Not Found error
  await TestValidator.httpError(
    "should return 404 when attempting to delete non-existent configuration",
    404,
    async () => {
      await api.functional.todoApp.todoUser.configurations.erase(
        userConnection,
        {
          configurationId: nonExistentConfigurationId,
        },
      );
    },
  );
}
