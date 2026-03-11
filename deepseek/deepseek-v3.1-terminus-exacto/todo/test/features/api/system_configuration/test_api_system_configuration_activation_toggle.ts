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
 * Test toggling the activation status of a system configuration.
 * Verify that when is_active is changed from true to false (or vice versa),
 * the configuration properly reflects the new activation state.
 * Validate that other configuration fields remain unchanged unless explicitly
 * modified. Test that version tracking increments correctly for activation
 * status changes.
 */
export async function test_api_system_configuration_activation_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Create a system configuration with is_active = true
  const created =
    await generate_random_multi_user_todo_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: `test.config.${RandomGenerator.alphaNumeric(8)}`,
          config_value: "initial value",
          data_type: "string" as const,
          scope: "global" as const,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.ICreate,
      },
    );
  typia.assert(created);
  // Verify initial state: active with version 1
  TestValidator.equals("initial is_active is true", created.is_active, true);
  TestValidator.equals("initial version is 1", created.version, 1);
  // Store original values for comparison
  const originalConfigKey = created.config_key;
  const originalConfigValue = created.config_value;
  const originalDataType = created.data_type;
  const originalScope = created.scope;
  const originalDescription = created.description;
  // 3. Toggle is_active from true to false
  const toggledToFalse =
    await api.functional.multiUserTodo.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: created.id,
        body: {
          is_active: false,
        } satisfies IMultiUserTodoSystemConfiguration.IUpdate,
      },
    );
  typia.assert(toggledToFalse);
  // Verify activation status changed to false
  TestValidator.equals(
    "is_active changed to false",
    toggledToFalse.is_active,
    false,
  );
  // Verify version incremented to 2
  TestValidator.equals("version incremented to 2", toggledToFalse.version, 2);
  // Verify other fields unchanged
  TestValidator.equals(
    "config_key unchanged",
    toggledToFalse.config_key,
    originalConfigKey,
  );
  TestValidator.equals(
    "config_value unchanged",
    toggledToFalse.config_value,
    originalConfigValue,
  );
  TestValidator.equals(
    "data_type unchanged",
    toggledToFalse.data_type,
    originalDataType,
  );
  TestValidator.equals("scope unchanged", toggledToFalse.scope, originalScope);
  TestValidator.equals(
    "description unchanged",
    toggledToFalse.description,
    originalDescription,
  );
  // 4. Toggle is_active back from false to true
  const toggledToTrue =
    await api.functional.multiUserTodo.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: created.id,
        body: {
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.IUpdate,
      },
    );
  typia.assert(toggledToTrue);
  // Verify activation status changed back to true
  TestValidator.equals(
    "is_active changed back to true",
    toggledToTrue.is_active,
    true,
  );
  // Verify version incremented to 3
  TestValidator.equals("version incremented to 3", toggledToTrue.version, 3);
  // Verify other fields still unchanged
  TestValidator.equals(
    "config_key still unchanged",
    toggledToTrue.config_key,
    originalConfigKey,
  );
  TestValidator.equals(
    "config_value still unchanged",
    toggledToTrue.config_value,
    originalConfigValue,
  );
  TestValidator.equals(
    "data_type still unchanged",
    toggledToTrue.data_type,
    originalDataType,
  );
  TestValidator.equals(
    "scope still unchanged",
    toggledToTrue.scope,
    originalScope,
  );
  TestValidator.equals(
    "description still unchanged",
    toggledToTrue.description,
    originalDescription,
  );
  // 5. Additional validation: Ensure version increments are monotonic
  TestValidator.predicate(
    "version monotonic increase",
    created.version < toggledToFalse.version,
  );
  TestValidator.predicate(
    "version monotonic increase 2",
    toggledToFalse.version < toggledToTrue.version,
  );
  // 6. Validate timestamps: updated_at should be more recent than created_at
  const createdDate = new Date(created.created_at).getTime();
  const updatedDate = new Date(toggledToTrue.updated_at).getTime();
  TestValidator.predicate(
    "updated_at after created_at",
    updatedDate > createdDate,
  );
}
