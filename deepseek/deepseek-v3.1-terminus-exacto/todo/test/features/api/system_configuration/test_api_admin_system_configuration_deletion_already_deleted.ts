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
 * Test deletion attempt on a system configuration that has already been soft deleted.
 * Create a system configuration first, authenticate as admin, then soft delete it.
 * Verify the system handles this gracefully by returning appropriate error response
 * (likely 404) and does not perform duplicate deletion operations.
 */
export async function test_api_admin_system_configuration_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - MUST use utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create system configuration - MUST use utility function
  const configuration =
    await generate_random_multi_user_todo_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: RandomGenerator.alphaNumeric(10),
          config_value: RandomGenerator.paragraph({ sentences: 1 }),
          data_type: RandomGenerator.pick([
            "string",
            "number",
            "boolean",
            "json",
          ] as const),
          scope: RandomGenerator.pick([
            "global",
            "component",
            "environment",
          ] as const),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        },
      },
    );
  typia.assert(configuration);
  // 3. Perform initial soft deletion (first deletion)
  await api.functional.multiUserTodo.admin.system_configurations.erase(
    adminConnection,
    {
      configurationId: configuration.id,
    },
  );
  // 4. Attempt to delete the already soft-deleted configuration
  await TestValidator.error("duplicate deletion should fail", async () => {
    await api.functional.multiUserTodo.admin.system_configurations.erase(
      adminConnection,
      {
        configurationId: configuration.id,
      },
    );
  });
}
