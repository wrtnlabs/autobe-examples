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
 * Test administrator updates an existing data retention policy with valid changes.
 * 1. Admin creates account via join operation
 * 2. Admin creates initial data retention policy
 * 3. Admin updates the policy with new values for all fields
 * 4. Verify all fields reflect changes, updated_at is updated, created_at unchanged
 * 5. Ensure policy uniqueness validation
 */
export async function test_api_data_retention_policy_update_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup with join operation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Create initial data retention policy
  const initialPolicy =
    await api.functional.multiUserTodo.admin.data_retention_policies.create(
      adminConnection,
      {
        body: {
          policy_name: `policy_${RandomGenerator.alphaNumeric(8)}`,
          target_entity_type: "todo",
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          archival_strategy: "archive",
          enforcement_enabled: true,
          compliance_required: false,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMultiUserTodoDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(initialPolicy);
  // Store original timestamps for verification
  const originalCreatedAt = initialPolicy.created_at;
  const originalUpdatedAt = initialPolicy.updated_at;
  // 3. Update policy with new values for all fields
  // Create unique policy name to avoid conflicts
  const updatedPolicyName = `updated_${RandomGenerator.alphaNumeric(8)}`;
  const updatedBody = {
    policy_name: updatedPolicyName,
    target_entity_type: "edit_history",
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    archival_strategy: "delete",
    enforcement_enabled: false,
    compliance_required: true,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IMultiUserTodoDataRetentionPolicy.IUpdate;
  const updatedPolicy =
    await api.functional.multiUserTodo.admin.data_retention_policies.update(
      adminConnection,
      {
        policyId: initialPolicy.id,
        body: updatedBody,
      },
    );
  typia.assert(updatedPolicy);
  // 4. Verify all changes were applied
  TestValidator.equals(
    "policy name updated",
    updatedPolicy.policy_name,
    updatedPolicyName,
  );
  TestValidator.equals(
    "target entity type updated",
    updatedPolicy.target_entity_type,
    "edit_history",
  );
  TestValidator.equals(
    "retention period updated",
    updatedPolicy.retention_period_days,
    updatedBody.retention_period_days,
  );
  TestValidator.equals(
    "archival strategy updated",
    updatedPolicy.archival_strategy,
    "delete",
  );
  TestValidator.equals(
    "enforcement enabled updated",
    updatedPolicy.enforcement_enabled,
    false,
  );
  TestValidator.equals(
    "compliance required updated",
    updatedPolicy.compliance_required,
    true,
  );
  // Description can be null or string, use appropriate check
  if (
    updatedBody.description !== null &&
    updatedBody.description !== undefined
  ) {
    TestValidator.equals(
      "description updated",
      updatedPolicy.description,
      updatedBody.description,
    );
  } else {
    TestValidator.equals("description null", updatedPolicy.description, null);
  }
  // 5. Verify timestamps
  TestValidator.equals(
    "created_at unchanged",
    updatedPolicy.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedPolicy.updated_at,
    originalUpdatedAt,
  );
  // 6. Test uniqueness validation with duplicate policy name
  // Create another policy with different initial name
  const otherPolicy =
    await api.functional.multiUserTodo.admin.data_retention_policies.create(
      adminConnection,
      {
        body: {
          policy_name: `other_${RandomGenerator.alphaNumeric(8)}`,
          target_entity_type: "audit_log",
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          archival_strategy: "anonymize",
          enforcement_enabled: true,
          compliance_required: false,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IMultiUserTodoDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(otherPolicy);
  // Try to update second policy with first policy's name - should fail due to uniqueness
  await TestValidator.error("duplicate policy name validation", async () => {
    await api.functional.multiUserTodo.admin.data_retention_policies.update(
      adminConnection,
      {
        policyId: otherPolicy.id,
        body: {
          policy_name: updatedPolicyName, // Already used by first updated policy
        } satisfies IMultiUserTodoDataRetentionPolicy.IUpdate,
      },
    );
  });
}
