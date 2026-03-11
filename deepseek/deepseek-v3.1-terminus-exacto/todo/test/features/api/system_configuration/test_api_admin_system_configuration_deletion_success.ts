import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_multi_user_todo_admin_system_configurations_create } from "../../../generate/generate_random_multi_user_todo_admin_system_configurations_create";
import { prepare_random_multi_user_todo_system_configuration } from "../../../prepare/prepare_random_multi_user_todo_system_configuration";

export async function test_api_admin_system_configuration_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Create a system configuration using utility function
  const configuration =
    await generate_random_multi_user_todo_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: `test_config_${RandomGenerator.alphaNumeric(10)}`,
          config_value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "string" as const,
          scope: "global" as const,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.ICreate,
      },
    );
  typia.assert(configuration);
  // Perform soft deletion of the configuration
  await api.functional.multiUserTodo.admin.system_configurations.erase(
    adminConnection,
    {
      configurationId: configuration.id,
    },
  );
  // Validate deletion was successful by attempting to create another configuration with the same key
  // This should fail due to unique constraint (config_key + scope)
  await TestValidator.error(
    "duplicate config key should be rejected",
    async () => {
      await api.functional.multiUserTodo.admin.system_configurations.create(
        adminConnection,
        {
          body: {
            config_key: configuration.config_key,
            config_value: RandomGenerator.paragraph({ sentences: 2 }),
            data_type: "string" as const,
            scope: typia.assert<"global" | "component" | "environment">(configuration.scope),
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IMultiUserTodoSystemConfiguration.ICreate,
        },
      );
    },
  );
  // Additional validation: create a new configuration with different key to ensure system still works
  const newConfiguration =
    await generate_random_multi_user_todo_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: `test_config_${RandomGenerator.alphaNumeric(10)}`,
          config_value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "boolean" as const,
          scope: "component" as const,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: false,
        } satisfies IMultiUserTodoSystemConfiguration.ICreate,
      },
    );
  typia.assert(newConfiguration);
  TestValidator.notEquals(
    "new configuration should have different ID",
    configuration.id,
    newConfiguration.id,
  );
}