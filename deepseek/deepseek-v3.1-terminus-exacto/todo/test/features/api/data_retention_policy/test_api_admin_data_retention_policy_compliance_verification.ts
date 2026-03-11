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

export async function test_api_admin_data_retention_policy_compliance_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Create high-compliance policy for todo entity
  const todoPolicyBody = {
    policy_name: `high-compliance-todo-${RandomGenerator.alphaNumeric(8)}`,
    target_entity_type: "todo" as const,
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<365>
    >(),
    archival_strategy: "delete",
    enforcement_enabled: true,
    compliance_required: true,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IMultiUserTodoDataRetentionPolicy.ICreate;
  const todoPolicy =
    await generate_random_multi_user_todo_admin_data_retention_policies_create(
      adminConnection,
      {
        body: todoPolicyBody,
      },
    );
  typia.assert(todoPolicy);
  // 3. Create standard policy for edit_history entity
  const editHistoryPolicyBody = {
    policy_name: `standard-edithistory-${RandomGenerator.alphaNumeric(8)}`,
    target_entity_type: "edit_history" as const,
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<180>
    >(),
    archival_strategy: "archive",
    enforcement_enabled: true,
    compliance_required: true,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMultiUserTodoDataRetentionPolicy.ICreate;
  const editHistoryPolicy =
    await generate_random_multi_user_todo_admin_data_retention_policies_create(
      adminConnection,
      {
        body: editHistoryPolicyBody,
      },
    );
  typia.assert(editHistoryPolicy);
  // 4. Create reference policy for audit_log entity
  const auditLogPolicyBody = {
    policy_name: `reference-auditlog-${RandomGenerator.alphaNumeric(8)}`,
    target_entity_type: "audit_log" as const,
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<90> & tags.Maximum<365>
    >(),
    archival_strategy: "anonymize",
    enforcement_enabled: false,
    compliance_required: false,
    description: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IMultiUserTodoDataRetentionPolicy.ICreate;
  const auditLogPolicy =
    await generate_random_multi_user_todo_admin_data_retention_policies_create(
      adminConnection,
      {
        body: auditLogPolicyBody,
      },
    );
  typia.assert(auditLogPolicy);
  // 5. Retrieve and verify todo policy
  const retrievedTodoPolicy =
    await api.functional.multiUserTodo.admin.data_retention_policies.at(
      adminConnection,
      {
        policyId: todoPolicy.id,
      },
    );
  typia.assert(retrievedTodoPolicy);
  TestValidator.equals(
    "todo policy id matches",
    retrievedTodoPolicy.id,
    todoPolicy.id,
  );
  TestValidator.equals(
    "todo policy name matches",
    retrievedTodoPolicy.policy_name,
    todoPolicyBody.policy_name,
  );
  TestValidator.equals(
    "todo target entity type",
    retrievedTodoPolicy.target_entity_type,
    "todo",
  );
  TestValidator.equals(
    "todo retention period",
    retrievedTodoPolicy.retention_period_days,
    todoPolicyBody.retention_period_days,
  );
  TestValidator.equals(
    "todo archival strategy",
    retrievedTodoPolicy.archival_strategy,
    "delete",
  );
  TestValidator.predicate(
    "todo enforcement enabled",
    retrievedTodoPolicy.enforcement_enabled === true,
  );
  TestValidator.predicate(
    "todo compliance required",
    retrievedTodoPolicy.compliance_required === true,
  );
  // 6. Retrieve and verify edit_history policy
  const retrievedEditHistoryPolicy =
    await api.functional.multiUserTodo.admin.data_retention_policies.at(
      adminConnection,
      {
        policyId: editHistoryPolicy.id,
      },
    );
  typia.assert(retrievedEditHistoryPolicy);
  TestValidator.equals(
    "edit_history policy id matches",
    retrievedEditHistoryPolicy.id,
    editHistoryPolicy.id,
  );
  TestValidator.equals(
    "edit_history policy name matches",
    retrievedEditHistoryPolicy.policy_name,
    editHistoryPolicyBody.policy_name,
  );
  TestValidator.equals(
    "edit_history target entity type",
    retrievedEditHistoryPolicy.target_entity_type,
    "edit_history",
  );
  TestValidator.equals(
    "edit_history retention period",
    retrievedEditHistoryPolicy.retention_period_days,
    editHistoryPolicyBody.retention_period_days,
  );
  TestValidator.equals(
    "edit_history archival strategy",
    retrievedEditHistoryPolicy.archival_strategy,
    "archive",
  );
  TestValidator.predicate(
    "edit_history enforcement enabled",
    retrievedEditHistoryPolicy.enforcement_enabled === true,
  );
  TestValidator.predicate(
    "edit_history compliance required",
    retrievedEditHistoryPolicy.compliance_required === true,
  );
  // 7. Retrieve and verify audit_log policy
  const retrievedAuditLogPolicy =
    await api.functional.multiUserTodo.admin.data_retention_policies.at(
      adminConnection,
      {
        policyId: auditLogPolicy.id,
      },
    );
  typia.assert(retrievedAuditLogPolicy);
  TestValidator.equals(
    "audit_log policy id matches",
    retrievedAuditLogPolicy.id,
    auditLogPolicy.id,
  );
  TestValidator.equals(
    "audit_log policy name matches",
    retrievedAuditLogPolicy.policy_name,
    auditLogPolicyBody.policy_name,
  );
  TestValidator.equals(
    "audit_log target entity type",
    retrievedAuditLogPolicy.target_entity_type,
    "audit_log",
  );
  TestValidator.equals(
    "audit_log retention period",
    retrievedAuditLogPolicy.retention_period_days,
    auditLogPolicyBody.retention_period_days,
  );
  TestValidator.equals(
    "audit_log archival strategy",
    retrievedAuditLogPolicy.archival_strategy,
    "anonymize",
  );
  TestValidator.predicate(
    "audit_log enforcement disabled",
    retrievedAuditLogPolicy.enforcement_enabled === false,
  );
  TestValidator.predicate(
    "audit_log compliance not required",
    retrievedAuditLogPolicy.compliance_required === false,
  );
  // 8. Validate timestamps and structure
  TestValidator.predicate(
    "todo policy has creation timestamp",
    retrievedTodoPolicy.created_at !== undefined,
  );
  TestValidator.predicate(
    "edit_history policy has updated timestamp",
    retrievedEditHistoryPolicy.updated_at !== undefined,
  );
  TestValidator.predicate(
    "audit_log policy not deleted",
    retrievedAuditLogPolicy.deleted_at === null,
  );
}
