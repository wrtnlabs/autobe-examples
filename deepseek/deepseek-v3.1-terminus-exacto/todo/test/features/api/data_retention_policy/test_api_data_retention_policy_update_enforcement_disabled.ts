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
 * Test administrator disables enforcement of existing retention policy.
 *
 * Important edge case for policy suspension without deletion. Test verifies:
 * 1. Admin authentication
 * 2. Create policy with enforcement_enabled=true
 * 3. Update policy to set enforcement_enabled=false
 * 4. Verify policy remains in system but enforcement is disabled
 * 5. Validate system allows policy modification even when disabled
 * 6. Ensure data integrity assurance requirements are considered
 */
export async function test_api_data_retention_policy_update_enforcement_disabled(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.multiUserTodo.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Create initial policy with enforcement_enabled=true
  const initialPolicy =
    await api.functional.multiUserTodo.admin.data_retention_policies.create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.name(),
          target_entity_type: "todo",
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          archival_strategy: "delete",
          enforcement_enabled: true,
          compliance_required: false,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMultiUserTodoDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(initialPolicy);
  // 3. Update policy to disable enforcement
  const updatedPolicy =
    await api.functional.multiUserTodo.admin.data_retention_policies.update(
      adminConnection,
      {
        policyId: initialPolicy.id,
        body: {
          enforcement_enabled: false,
        } satisfies IMultiUserTodoDataRetentionPolicy.IUpdate,
      },
    );
  typia.assert(updatedPolicy);
  // 4. Verify policy remains but enforcement is disabled
  TestValidator.equals(
    "policy id unchanged",
    updatedPolicy.id,
    initialPolicy.id,
  );
  TestValidator.equals(
    "enforcement disabled",
    updatedPolicy.enforcement_enabled,
    false,
  );
  TestValidator.notEquals(
    "enforcement changed from initial",
    updatedPolicy.enforcement_enabled,
    initialPolicy.enforcement_enabled,
  );
  TestValidator.equals(
    "policy_name unchanged",
    updatedPolicy.policy_name,
    initialPolicy.policy_name,
  );
  TestValidator.equals(
    "target_entity_type unchanged",
    updatedPolicy.target_entity_type,
    initialPolicy.target_entity_type,
  );
  TestValidator.equals(
    "retention_period_days unchanged",
    updatedPolicy.retention_period_days,
    initialPolicy.retention_period_days,
  );
  TestValidator.equals(
    "archival_strategy unchanged",
    updatedPolicy.archival_strategy,
    initialPolicy.archival_strategy,
  );
  TestValidator.equals(
    "compliance_required unchanged",
    updatedPolicy.compliance_required,
    initialPolicy.compliance_required,
  );
  // 5. Validate system allows further modification even when disabled
  const reUpdatedPolicy =
    await api.functional.multiUserTodo.admin.data_retention_policies.update(
      adminConnection,
      {
        policyId: initialPolicy.id,
        body: {
          policy_name: RandomGenerator.name(),
        } satisfies IMultiUserTodoDataRetentionPolicy.IUpdate,
      },
    );
  typia.assert(reUpdatedPolicy);
  TestValidator.equals(
    "enforcement remains disabled after further update",
    reUpdatedPolicy.enforcement_enabled,
    false,
  );
  TestValidator.notEquals(
    "policy name changed",
    reUpdatedPolicy.policy_name,
    updatedPolicy.policy_name,
  );
}
