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
export async function test_api_todo_user_configuration_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first user and authenticate
  const firstUser = await authorize_todo_user_join(connection, {
    body: {
      email: `first-${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Create connection for first user with authentication token
  const firstUserConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${firstUser.token.access}` },
  };
  // Step 2: First user creates a configuration
  const configuration =
    await generate_random_todo_app_todo_user_configurations_create(
      firstUserConnection,
      {},
    );
  // Step 3: Create second user and authenticate
  const secondUser = await authorize_todo_user_join(connection, {
    body: {
      email: `second-${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Create connection for second user with authentication token
  const secondUserConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${secondUser.token.access}` },
  };
  // Step 4: Second user attempts to delete first user's configuration
  await TestValidator.error(
    "second user cannot delete first user's configuration",
    async () => {
      await api.functional.todoApp.todoUser.configurations.erase(
        secondUserConnection,
        {
          configurationId: configuration.id,
        },
      );
    },
  );
  // Step 5: Verify first user can still access their configuration
  // This confirms the configuration wasn't actually deleted
  const firstUserConnectionForVerification: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${firstUser.token.access}` },
  };
  // We expect this to succeed since the configuration should still exist
  const verificationConfig =
    await api.functional.todoApp.todoUser.configurations.create(
      firstUserConnectionForVerification,
      { body: {} },
    );
  typia.assert(verificationConfig);
}
