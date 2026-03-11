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

/**
 * Administrator toggles compliance_required flag on existing data retention policy.
 * Test steps:
 * 1. Create admin authentication context
 * 2. Create initial data retention policy with compliance_required=false
 * 3. Update the policy to set compliance_required=true
 * 4. Verify the policy reflects the updated compliance requirement
 * 5. Validate system behavior - ensure no other fields are changed
 */
export async function test_api_data_retention_policy_update_compliance_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Create initial policy with compliance_required=false
  const initialPolicy =
    await generate_random_multi_user_todo_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          compliance_required: false,
        },
      },
    );
  typia.assert(initialPolicy);
  TestValidator.equals(
    "compliance initially false",
    initialPolicy.compliance_required,
    false,
  );
  // 3. Update policy to toggle compliance_required=true
  const updatedPolicy =
    await api.functional.multiUserTodo.admin.data_retention_policies.update(
      adminConnection,
      {
        policyId: initialPolicy.id,
        body: {
          compliance_required: true,
        } satisfies IMultiUserTodoDataRetentionPolicy.IUpdate,
      },
    );
  typia.assert(updatedPolicy);
  // 4. Validate compliance flag was toggled
  TestValidator.equals(
    "compliance set to true",
    updatedPolicy.compliance_required,
    true,
  );
  TestValidator.equals(
    "policy ID unchanged",
    updatedPolicy.id,
    initialPolicy.id,
  );
  // 5. Validate other fields remain unchanged
  TestValidator.equals(
    "policy name unchanged",
    updatedPolicy.policy_name,
    initialPolicy.policy_name,
  );
  TestValidator.equals(
    "target entity unchanged",
    updatedPolicy.target_entity_type,
    initialPolicy.target_entity_type,
  );
  TestValidator.equals(
    "retention period unchanged",
    updatedPolicy.retention_period_days,
    initialPolicy.retention_period_days,
  );
  TestValidator.equals(
    "archival strategy unchanged",
    updatedPolicy.archival_strategy,
    initialPolicy.archival_strategy,
  );
  TestValidator.equals(
    "enforcement enabled unchanged",
    updatedPolicy.enforcement_enabled,
    initialPolicy.enforcement_enabled,
  );
  TestValidator.equals(
    "description unchanged",
    updatedPolicy.description,
    initialPolicy.description,
  );
  // 6. Validate timestamps
  TestValidator.equals(
    "created_at unchanged",
    updatedPolicy.created_at,
    initialPolicy.created_at,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedPolicy.updated_at !== initialPolicy.updated_at,
  );
  TestValidator.equals("deleted_at null", updatedPolicy.deleted_at, null);
}
