import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_user_configuration_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: userEmail,
    password: "TestPassword123!",
  } satisfies ITodoUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // Step 2: Create a configuration setting for retrieval testing
  const configKey = `test_config_${RandomGenerator.alphabets(8)}`;
  const configValue = JSON.stringify({ feature: "enabled", max_items: 50 });
  const configDescription = RandomGenerator.paragraph({ sentences: 3 });
  const configType = "json";
  const isSystem = false;

  const createBody = {
    key: configKey,
    value: configValue,
    type: configType,
    description: configDescription,
    is_system: isSystem,
  } satisfies ITodoConfiguration.ICreate;

  const createdConfig = await api.functional.todo.configurations.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(createdConfig);

  // Step 3: Retrieve the configuration by ID
  const retrievedConfig = await api.functional.todo.user.configurations.at(
    connection,
    {
      id: createdConfig.id,
    },
  );
  typia.assert(retrievedConfig);

  // Step 4: Validate retrieved configuration matches the created one
  TestValidator.equals(
    "configuration ID matches",
    retrievedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "configuration key matches",
    retrievedConfig.key,
    configKey,
  );
  TestValidator.equals(
    "configuration value matches",
    retrievedConfig.value,
    configValue,
  );
  TestValidator.equals(
    "configuration type matches",
    retrievedConfig.type,
    configType,
  );
  TestValidator.equals(
    "configuration description matches",
    retrievedConfig.description,
    configDescription,
  );
  TestValidator.equals(
    "configuration is_system flag matches",
    retrievedConfig.is_system,
    isSystem,
  );
  TestValidator.equals(
    "configuration created_at matches",
    retrievedConfig.created_at,
    createdConfig.created_at,
  );
  TestValidator.equals(
    "configuration updated_at matches",
    retrievedConfig.updated_at,
    createdConfig.updated_at,
  );
  TestValidator.equals(
    "configuration deleted_at matches",
    retrievedConfig.deleted_at,
    createdConfig.deleted_at,
  );

  // Step 5: Validate business logic expectations
  TestValidator.predicate(
    "configuration is not deleted",
    retrievedConfig.deleted_at === null,
  );
  TestValidator.predicate(
    "configuration is not system-level",
    retrievedConfig.is_system === false,
  );
  TestValidator.predicate(
    "created_at timestamp is valid",
    typeof retrievedConfig.created_at === "string" &&
      new Date(retrievedConfig.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    typeof retrievedConfig.updated_at === "string" &&
      new Date(retrievedConfig.updated_at).toString() !== "Invalid Date",
  );
}
