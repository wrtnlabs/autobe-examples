import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_multi_user_todo_admin_data_retention_policies_create } from "../../../generate/generate_random_multi_user_todo_admin_data_retention_policies_create";
import { prepare_random_multi_user_todo_data_retention_policy } from "../../../prepare/prepare_random_multi_user_todo_data_retention_policy";

export async function test_api_data_retention_policy_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Create a data retention policy
  const policy =
    await generate_random_multi_user_todo_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          target_entity_type: "todo",
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          archival_strategy: "archive",
          enforcement_enabled: true,
          compliance_required: false,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IMultiUserTodoDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy);
  // 3. Delete the policy (soft deletion)
  await api.functional.multiUserTodo.admin.data_retention_policies.erase(
    adminConnection,
    {
      policyId: policy.id,
    },
  );
  // 4. Validate successful deletion - no body returned, no errors thrown
  // Since it's void return type, successful execution indicates deletion succeeded
  // For soft deletion verification, we could attempt to delete again expecting an error
  // (already deleted policies should return 409 conflict)
  await TestValidator.error(
    "cannot delete already deleted policy",
    async () => {
      await api.functional.multiUserTodo.admin.data_retention_policies.erase(
        adminConnection,
        {
          policyId: policy.id,
        },
      );
    },
  );
}
