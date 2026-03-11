import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin password reset token verification when token does not exist.
 * 1. Create an admin account using authorize_admin_join
 * 2. Attempt to verify a non-existent UUID token
 * 3. Validate that the system properly handles missing tokens with error response
 */
export async function test_api_admin_password_resets_non_existent_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Generate a non-existent UUID token
  const nonExistentToken = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to verify the non-existent token - should throw error
  await TestValidator.error(
    "non-existent token should throw error",
    async () => {
      await api.functional.multiUserTodo.admin.admins.password_resets.at(
        adminConnection,
        {
          resetTokenId: nonExistentToken,
        },
      );
    },
  );
}
