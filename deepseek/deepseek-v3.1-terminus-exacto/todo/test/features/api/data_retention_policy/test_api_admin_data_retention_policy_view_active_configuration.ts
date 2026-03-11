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
 * Test the retrieval of an active data retention policy configuration by an administrator.
 * 1. Create admin account through join endpoint
 * 2. Create a data retention policy for todo entities with 30-day retention period
 * 3. Retrieve the created policy by its ID
 * 4. Verify all policy details are correctly returned
 */
export async function test_api_admin_data_retention_policy_view_active_configuration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup with dedicated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create data retention policy
  const createBody = {
    policy_name: RandomGenerator.paragraph({ sentences: 2 }),
    target_entity_type: "todo",
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<30>
    >() satisfies number as number,
    archival_strategy: "archive",
    enforcement_enabled: true,
    compliance_required: true,
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IMultiUserTodoDataRetentionPolicy.ICreate;
  const createdPolicy =
    await generate_random_multi_user_todo_admin_data_retention_policies_create(
      adminConnection,
      { body: createBody },
    );
  typia.assert(createdPolicy);
  // 3. Retrieve the policy
  const retrievedPolicy =
    await api.functional.multiUserTodo.admin.data_retention_policies.at(
      adminConnection,
      { policyId: createdPolicy.id },
    );
  typia.assert(retrievedPolicy);
  // 4. Validate all fields match creation input
  TestValidator.equals(
    "policy id matches",
    retrievedPolicy.id,
    createdPolicy.id,
  );
  TestValidator.equals(
    "policy name matches",
    retrievedPolicy.policy_name,
    createBody.policy_name,
  );
  TestValidator.equals(
    "target entity type matches",
    retrievedPolicy.target_entity_type,
    createBody.target_entity_type,
  );
  TestValidator.equals(
    "retention period days matches",
    retrievedPolicy.retention_period_days,
    createBody.retention_period_days,
  );
  TestValidator.equals(
    "archival strategy matches",
    retrievedPolicy.archival_strategy,
    createBody.archival_strategy,
  );
  TestValidator.equals(
    "enforcement enabled matches",
    retrievedPolicy.enforcement_enabled,
    createBody.enforcement_enabled,
  );
  TestValidator.equals(
    "compliance required matches",
    retrievedPolicy.compliance_required,
    createBody.compliance_required,
  );
  TestValidator.equals(
    "description matches",
    retrievedPolicy.description,
    createBody.description,
  );
  TestValidator.predicate(
    "created at is valid timestamp",
    retrievedPolicy.created_at !== null,
  );
  TestValidator.predicate(
    "updated at is valid timestamp",
    retrievedPolicy.updated_at !== null,
  );
  TestValidator.equals(
    "deleted at is null for active policy",
    retrievedPolicy.deleted_at,
    null,
  );
}
