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
export async function test_api_todo_user_configuration_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user through join
  const userJoin = await authorize_todo_user_join(connection, {});
  typia.assert(userJoin);
  // Step 2: Create a new configuration using the user's connection
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: `Bearer ${userJoin.token.access}` };
  const configuration =
    await generate_random_todo_app_todo_user_configurations_create(
      userConnection,
      {},
    );
  typia.assert(configuration);
  // Step 3: Update the configuration
  const updateData = {} satisfies ITodoAppConfiguration.IUpdate;
  const updatedConfiguration =
    await api.functional.todoApp.todoUser.configurations.update(
      userConnection,
      {
        configurationId: configuration.id,
        body: updateData,
      },
    );
  typia.assert(updatedConfiguration);
  // Step 4: Verify the configuration was updated (basic verification since IUpdate is empty)
  TestValidator.equals(
    "configuration id matches",
    updatedConfiguration.id,
    configuration.id,
  );
}
