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

export async function test_api_admin_data_retention_policy_view_soft_deleted_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Create data retention policy targeting audit_log
  const createBody = {
    policy_name: RandomGenerator.paragraph({ sentences: 1 }),
    target_entity_type: "audit_log",
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    archival_strategy: RandomGenerator.pick([
      "archive",
      "delete",
      "anonymize",
    ] as const),
    enforcement_enabled: typia.random<boolean>(),
    compliance_required: typia.random<boolean>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMultiUserTodoDataRetentionPolicy.ICreate;
  const policy =
    await generate_random_multi_user_todo_admin_data_retention_policies_create(
      adminConnection,
      {
        body: createBody,
      },
    );
  typia.assert(policy);
  // 3. Soft delete the policy
  await api.functional.multiUserTodo.admin.data_retention_policies.erase(
    adminConnection,
    {
      policyId: policy.id,
    },
  );
  // 4. Retrieve the soft-deleted policy
  const retrieved =
    await api.functional.multiUserTodo.admin.data_retention_policies.at(
      adminConnection,
      {
        policyId: policy.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate soft deletion and data integrity
  TestValidator.predicate(
    "deleted_at should be populated",
    retrieved.deleted_at !== null,
  );
  TestValidator.equals("policy ID matches original", retrieved.id, policy.id);
  TestValidator.equals(
    "policy name matches original",
    retrieved.policy_name,
    createBody.policy_name,
  );
  TestValidator.equals(
    "target entity type matches original",
    retrieved.target_entity_type,
    createBody.target_entity_type,
  );
  TestValidator.equals(
    "retention period days matches original",
    retrieved.retention_period_days,
    createBody.retention_period_days,
  );
  TestValidator.equals(
    "archival strategy matches original",
    retrieved.archival_strategy,
    createBody.archival_strategy,
  );
  TestValidator.equals(
    "enforcement flag matches original",
    retrieved.enforcement_enabled,
    createBody.enforcement_enabled,
  );
  TestValidator.equals(
    "compliance flag matches original",
    retrieved.compliance_required,
    createBody.compliance_required,
  );
  TestValidator.equals(
    "description matches original",
    retrieved.description,
    createBody.description,
  );
}
