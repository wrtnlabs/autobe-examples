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

/**
 * Test the business rule enforcement that config_key must be unique within the same scope.
 *
 * 1. Authenticate as admin via join
 * 2. Create a system configuration with specific config_key and scope 'component'
 * 3. Attempt to create a second configuration with the exact same config_key and scope 'component' - this should fail
 * 4. Test that different scopes can use the same config_key: create a configuration with the same config_key but scope 'environment' - this should succeed
 * 5. Test that a completely different config_key with the same scope should succeed
 * 6. Validate proper error handling and messaging for duplicate configurations
 */
export async function test_api_admin_system_configuration_unique_key_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Generate random test data
  const duplicateKey = RandomGenerator.alphabets(10);
  const differentKey = RandomGenerator.alphabets(12);
  // 2. Create first configuration with scope 'component'
  const firstConfig =
    await api.functional.multiUserTodo.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          config_key: duplicateKey,
          config_value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "string" as const,
          scope: "component" as const,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.ICreate,
      },
    );
  typia.assert(firstConfig);
  TestValidator.equals("first config scope", firstConfig.scope, "component");
  TestValidator.equals(
    "first config key",
    firstConfig.config_key,
    duplicateKey,
  );
  // 3. Attempt duplicate creation (same key + same scope) - should fail
  await TestValidator.error("duplicate key within same scope", async () => {
    await api.functional.multiUserTodo.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          config_key: duplicateKey,
          config_value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "string" as const,
          scope: "component" as const,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.ICreate,
      },
    );
  });
  // 4. Create configuration with same key but different scope 'environment' - should succeed
  const crossScopeConfig =
    await api.functional.multiUserTodo.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          config_key: duplicateKey,
          config_value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "number" as const,
          scope: "environment" as const,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: false,
        } satisfies IMultiUserTodoSystemConfiguration.ICreate,
      },
    );
  typia.assert(crossScopeConfig);
  TestValidator.equals(
    "cross-scope config key",
    crossScopeConfig.config_key,
    duplicateKey,
  );
  TestValidator.equals(
    "cross-scope config scope",
    crossScopeConfig.scope,
    "environment",
  );
  TestValidator.notEquals(
    "different scope IDs",
    firstConfig.id,
    crossScopeConfig.id,
  );
  // 5. Create configuration with different key but same scope 'component' - should succeed
  const differentKeyConfig =
    await api.functional.multiUserTodo.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          config_key: differentKey,
          config_value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "boolean" as const,
          scope: "component" as const,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.ICreate,
      },
    );
  typia.assert(differentKeyConfig);
  TestValidator.equals(
    "different key config scope",
    differentKeyConfig.scope,
    "component",
  );
  TestValidator.equals(
    "different key config key",
    differentKeyConfig.config_key,
    differentKey,
  );
  TestValidator.notEquals(
    "different key IDs",
    firstConfig.id,
    differentKeyConfig.id,
  );
  TestValidator.notEquals(
    "all IDs unique",
    crossScopeConfig.id,
    differentKeyConfig.id,
  );
  // 6. Validate business rule: duplicate with same scope 'environment' should also fail
  await TestValidator.error(
    "duplicate key within environment scope",
    async () => {
      await api.functional.multiUserTodo.admin.system_configurations.create(
        adminConnection,
        {
          body: {
            config_key: duplicateKey,
            config_value: RandomGenerator.paragraph({ sentences: 2 }),
            data_type: "json" as const,
            scope: "environment" as const,
            description: RandomGenerator.paragraph({ sentences: 1 }),
            is_active: true,
          } satisfies IMultiUserTodoSystemConfiguration.ICreate,
        },
      );
    },
  );
  // Final validation: all three configurations exist and are different
  TestValidator.predicate(
    "first config is active",
    firstConfig.is_active === true,
  );
  TestValidator.predicate(
    "cross-scope config is inactive",
    crossScopeConfig.is_active === false,
  );
  TestValidator.predicate(
    "different key config is active",
    differentKeyConfig.is_active === true,
  );
}
