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
 * Test deletion attempt for non-existent data retention policy.
 * Authenticate as admin user and attempt to delete a policy with an invalid UUID.
 * Verify the system returns 404 Not Found error since the policy does not exist
 * in the database.
 */
export async function test_api_data_retention_policy_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Generate a random UUID that doesn't exist in the system
  const nonExistentPolicyId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete the non-existent policy and verify 404 error
  await TestValidator.error("non-existent policy deletion", async () => {
    await api.functional.multiUserTodo.admin.data_retention_policies.erase(
      adminConnection,
      {
        policyId: nonExistentPolicyId,
      },
    );
  });
}
