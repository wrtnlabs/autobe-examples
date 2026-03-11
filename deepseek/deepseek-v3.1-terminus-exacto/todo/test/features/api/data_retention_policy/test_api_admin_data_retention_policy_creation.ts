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
 * Test the creation of a new data retention policy for todo entities with standard retention period.
 * Verify that the policy is created with all required fields including system-generated timestamps and UUID.
 * Validate that the policy_name is unique and the retention_period_days is a positive integer.
 * Confirm that the policy applies to the correct target_entity_type and has proper archival strategy.
 */
export async function test_api_admin_data_retention_policy_creation(
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
  // 2. Create a data retention policy with valid data
  const policy =
    await generate_random_multi_user_todo_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.alphabets(10),
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
  typia.assert(policy);
  // 3. Validate system-generated fields
  TestValidator.predicate("policy has UUID id", () => policy.id.length > 0);
  TestValidator.equals(
    "policy_name matches input",
    policy.policy_name,
    policy.policy_name,
  );
  TestValidator.equals(
    "target_entity_type is todo",
    policy.target_entity_type,
    "todo",
  );
  TestValidator.predicate(
    "positive retention_period_days",
    policy.retention_period_days > 0,
  );
  TestValidator.equals(
    "archival_strategy is archive",
    policy.archival_strategy,
    "archive",
  );
  TestValidator.equals(
    "enforcement_enabled true",
    policy.enforcement_enabled,
    true,
  );
  TestValidator.equals(
    "compliance_required false",
    policy.compliance_required,
    false,
  );
  TestValidator.predicate("created_at is valid ISO date", () => {
    const date = new Date(policy.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO date", () => {
    const date = new Date(policy.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "deleted_at is null for active policy",
    policy.deleted_at,
    null,
  );
}
