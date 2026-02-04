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
import { prepare_random_todo_app_configuration } from "../../../prepare/prepare_random_todo_app_configuration";
import { generate_random_todo_app_todo_user_configurations_create } from "../../../generate/generate_random_todo_app_todo_user_configurations_create";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_todo_user_configuration_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user
  const todoUser = await authorize_todo_user_join(connection, {
    body: {
      email: `test-${RandomGenerator.alphabets(10)}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Step 2: Create a new connection for the user with authorization token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${todoUser.token.access}`,
    },
  };
  // Step 3: Create a configuration to be deleted
  const configuration =
    await generate_random_todo_app_todo_user_configurations_create(
      userConnection,
      {
        body: {},
      },
    );
  // Step 4: Delete the configuration
  const deletedConfiguration =
    await api.functional.todoApp.todoUser.configurations.erase(userConnection, {
      configurationId: configuration.id,
    });
  // Step 5: Validate the response
  typia.assert(deletedConfiguration);
  TestValidator.equals(
    "deleted configuration ID should match created configuration ID",
    deletedConfiguration.id,
    configuration.id,
  );
}
