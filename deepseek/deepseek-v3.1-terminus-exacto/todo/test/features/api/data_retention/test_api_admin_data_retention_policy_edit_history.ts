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
 * Test creation of a data retention policy specifically for edit_history entities with detailed description.
 * Verify that the policy applies to edit_history target_entity_type with appropriate retention period and archival strategy.
 * Validate that optional description field is properly stored and returned in the response.
 */
export async function test_api_admin_data_retention_policy_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup using utility function (ABSOLUTE PRIORITY)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_123",
      display_name: "Admin User",
    },
  });
  typia.assert(admin);
  // 2. Policy configuration for edit_history
  const retentionPeriod = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const description = RandomGenerator.paragraph({ sentences: 2 });
  // 3. Create policy using utility function (ABSOLUTE PRIORITY)
  const policy =
    await generate_random_multi_user_todo_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: `edit_history_retention_${RandomGenerator.alphabets(8)}`,
          target_entity_type: "edit_history",
          retention_period_days: retentionPeriod,
          archival_strategy: "archive",
          enforcement_enabled: true,
          compliance_required: false,
          description: description,
        },
      },
    );
  typia.assert(policy);
  // 4. Validate policy details
  TestValidator.equals(
    "policy applies to edit_history",
    policy.target_entity_type,
    "edit_history",
  );
  TestValidator.equals(
    "retention period matches",
    policy.retention_period_days,
    retentionPeriod,
  );
  TestValidator.equals(
    "archival strategy is archive",
    policy.archival_strategy,
    "archive",
  );
  TestValidator.equals(
    "description is stored",
    policy.description,
    description,
  );
  TestValidator.predicate("policy is enabled", policy.enforcement_enabled);
  TestValidator.predicate(
    "policy is not compliance required",
    !policy.compliance_required,
  );
  TestValidator.predicate(
    "policy has UUID id",
    /^[0-9a-f\-]{36}$/i.test(policy.id),
  );
  TestValidator.predicate(
    "policy has created_at timestamp",
    typeof policy.created_at === "string",
  );
  TestValidator.predicate(
    "policy has updated_at timestamp",
    typeof policy.updated_at === "string",
  );
  TestValidator.predicate("policy not deleted", policy.deleted_at === null);
}
