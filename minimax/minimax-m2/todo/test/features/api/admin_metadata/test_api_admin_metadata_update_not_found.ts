import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemMetadata";

export async function test_api_admin_metadata_update_not_found(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: typia.random<string>(),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Attempt to update non-existent configuration key
  const nonExistentConfigKey = `non.existent.config.${RandomGenerator.alphaNumeric(8)}`;

  // 3. Validate that the update operation fails for non-existent configuration
  await TestValidator.error(
    "should fail when updating non-existent configuration key",
    async () => {
      await api.functional.todoApp.admin.system.metadata.update(connection, {
        configKey: nonExistentConfigKey,
        body: {
          config_value: "some_value",
          description: "This should fail because config doesn't exist",
        } satisfies ITodoAppSystemMetadata.IUpdate,
      });
    },
  );
}
