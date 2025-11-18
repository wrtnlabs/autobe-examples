import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";

export async function test_api_todo_list_system_configuration_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new system configuration
  const configKey = `config_key_${RandomGenerator.alphabets(8)}`;
  const configValue = RandomGenerator.alphabets(12);
  const configDescription = `Description for ${configKey}`;
  const configCreateBody = {
    key: configKey,
    value: configValue,
    description: configDescription,
  } satisfies ITodoListSystemConfiguration.ICreate;
  const createdConfig: ITodoListSystemConfiguration =
    await api.functional.todoList.admin.todoListSystemConfigurations.create(
      connection,
      {
        body: configCreateBody,
      },
    );
  typia.assert(createdConfig);

  // 3. Verify the created configuration matches input
  TestValidator.equals(
    "created config key matches",
    createdConfig.key,
    configCreateBody.key,
  );
  TestValidator.equals(
    "created config value matches",
    createdConfig.value,
    configCreateBody.value,
  );
  TestValidator.equals(
    "created config description matches",
    createdConfig.description,
    configCreateBody.description,
  );

  // 4. Verify created and updated timestamps are set
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof createdConfig.created_at === "string" &&
      createdConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof createdConfig.updated_at === "string" &&
      createdConfig.updated_at.length > 0,
  );

  // 5. Negative test: try to create without authentication
  // Create a connection without auth headers
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "creation fails without authentication",
    async () => {
      await api.functional.todoList.admin.todoListSystemConfigurations.create(
        unauthenticatedConn,
        {
          body: configCreateBody,
        },
      );
    },
  );
}
