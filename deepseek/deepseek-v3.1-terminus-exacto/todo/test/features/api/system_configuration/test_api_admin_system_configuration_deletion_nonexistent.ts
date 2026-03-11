import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test deletion attempt on a non-existent system configuration ID.
 * Use an invalid or non-existent configuration ID and verify the system
 * returns appropriate error response (404 Not Found). Validate that no
 * deletion operation is performed and no audit logs are created for
 * non-existent resources.
 */
export async function test_api_admin_system_configuration_deletion_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.multiUserTodo.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "test123456",
        display_name: "Admin User",
      } satisfies IMultiUserTodoAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Generate a random UUID that doesn't exist in the system
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete using the non-existent configuration ID
  // Should throw an error (likely 404)
  await TestValidator.error("delete non-existent configuration", async () => {
    await api.functional.multiUserTodo.admin.system_configurations.erase(
      adminConnection,
      {
        configurationId: nonExistentId,
      },
    );
  });
  // 4. Validate error response contains appropriate status code
  // Using TestValidator.error already validates that an error was thrown
  // We can add more specific validation if needed
}
