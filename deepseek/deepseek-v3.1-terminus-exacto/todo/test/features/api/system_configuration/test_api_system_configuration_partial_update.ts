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

export async function test_api_system_configuration_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Create initial configuration
  const initialConfig =
    await generate_random_multi_user_todo_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: RandomGenerator.alphabets(10),
          config_value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "string" as const,
          scope: "global" as const,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);
  // 3. Test partial update - description only
  const updatedDescription =
    await api.functional.multiUserTodo.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: initialConfig.id,
        body: {
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IMultiUserTodoSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedDescription);
  // Verify description update
  TestValidator.notEquals(
    "description should change",
    initialConfig.description,
    updatedDescription.description,
  );
  TestValidator.equals(
    "config_key should remain unchanged",
    initialConfig.config_key,
    updatedDescription.config_key,
  );
  TestValidator.equals(
    "config_value should remain unchanged",
    initialConfig.config_value,
    updatedDescription.config_value,
  );
  TestValidator.equals(
    "data_type should remain unchanged",
    initialConfig.data_type,
    updatedDescription.data_type,
  );
  TestValidator.equals(
    "scope should remain unchanged",
    initialConfig.scope,
    updatedDescription.scope,
  );
  TestValidator.equals(
    "is_active should remain unchanged",
    initialConfig.is_active,
    updatedDescription.is_active,
  );
  TestValidator.equals(
    "version should increment",
    initialConfig.version + 1,
    updatedDescription.version,
  );
  TestValidator.notEquals(
    "updated_at should change",
    initialConfig.updated_at,
    updatedDescription.updated_at,
  );
  // 4. Test partial update - config_value only
  const updatedValue =
    await api.functional.multiUserTodo.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: initialConfig.id,
        body: {
          config_value: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IMultiUserTodoSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedValue);
  // Verify config_value update
  TestValidator.notEquals(
    "config_value should change",
    updatedDescription.config_value,
    updatedValue.config_value,
  );
  TestValidator.equals(
    "description should remain from previous update",
    updatedDescription.description,
    updatedValue.description,
  );
  TestValidator.equals(
    "config_key should remain unchanged",
    initialConfig.config_key,
    updatedValue.config_key,
  );
  TestValidator.equals(
    "data_type should remain unchanged",
    initialConfig.data_type,
    updatedValue.data_type,
  );
  TestValidator.equals(
    "scope should remain unchanged",
    initialConfig.scope,
    updatedValue.scope,
  );
  TestValidator.equals(
    "is_active should remain unchanged",
    initialConfig.is_active,
    updatedValue.is_active,
  );
  TestValidator.equals(
    "version should increment again",
    updatedDescription.version + 1,
    updatedValue.version,
  );
  TestValidator.notEquals(
    "updated_at should change again",
    updatedDescription.updated_at,
    updatedValue.updated_at,
  );
  // 5. Test partial update - scope only
  const updatedScope =
    await api.functional.multiUserTodo.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: initialConfig.id,
        body: {
          scope: "component" as const,
        } satisfies IMultiUserTodoSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedScope);
  // Verify scope update
  TestValidator.notEquals(
    "scope should change",
    updatedValue.scope,
    updatedScope.scope,
  );
  TestValidator.equals(
    "description should remain from previous update",
    updatedValue.description,
    updatedScope.description,
  );
  TestValidator.equals(
    "config_key should remain unchanged",
    initialConfig.config_key,
    updatedScope.config_key,
  );
  TestValidator.equals(
    "config_value should remain from previous update",
    updatedValue.config_value,
    updatedScope.config_value,
  );
  TestValidator.equals(
    "data_type should remain unchanged",
    initialConfig.data_type,
    updatedScope.data_type,
  );
  TestValidator.equals(
    "is_active should remain unchanged",
    initialConfig.is_active,
    updatedScope.is_active,
  );
  TestValidator.equals(
    "version should increment again",
    updatedValue.version + 1,
    updatedScope.version,
  );
  TestValidator.notEquals(
    "updated_at should change again",
    updatedValue.updated_at,
    updatedScope.updated_at,
  );
  // 6. Test partial update - is_active only
  const updatedActive =
    await api.functional.multiUserTodo.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: initialConfig.id,
        body: {
          is_active: false,
        } satisfies IMultiUserTodoSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedActive);
  // Verify is_active update
  TestValidator.notEquals(
    "is_active should change",
    updatedScope.is_active,
    updatedActive.is_active,
  );
  TestValidator.equals(
    "description should remain from previous update",
    updatedScope.description,
    updatedActive.description,
  );
  TestValidator.equals(
    "config_key should remain unchanged",
    initialConfig.config_key,
    updatedActive.config_key,
  );
  TestValidator.equals(
    "config_value should remain from previous update",
    updatedScope.config_value,
    updatedActive.config_value,
  );
  TestValidator.equals(
    "data_type should remain unchanged",
    initialConfig.data_type,
    updatedActive.data_type,
  );
  TestValidator.equals(
    "scope should remain from previous update",
    updatedScope.scope,
    updatedActive.scope,
  );
  TestValidator.equals(
    "version should increment again",
    updatedScope.version + 1,
    updatedActive.version,
  );
  TestValidator.notEquals(
    "updated_at should change again",
    updatedScope.updated_at,
    updatedActive.updated_at,
  );
}
