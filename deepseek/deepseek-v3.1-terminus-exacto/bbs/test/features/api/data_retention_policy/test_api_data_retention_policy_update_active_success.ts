import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_data_retention_policy_update_active_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 2: Create initial active data retention policy
  const createBody = {
    policy_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3650>
    >(),
    retention_action: RandomGenerator.pick([
      "delete",
      "archive",
      "anonymize",
    ] as const),
    compliance_standard: RandomGenerator.pick([
      "GDPR",
      "CCPA",
      "HIPAA",
      null,
    ] as const),
    is_active: true,
  } satisfies IDiscussionBoardDataRetentionPolicy.IUpdate;
  // Note: Since no create utility function exists, we need to simulate policy creation
  // In a real scenario, this would be a database insertion or API call
  const existingPolicy: IDiscussionBoardDataRetentionPolicy = {
    id: typia.random<string & tags.Format<"uuid">>(),
    policy_name: createBody.policy_name!,
    description: createBody.description!,
    retention_period_days: createBody.retention_period_days!,
    retention_action: createBody.retention_action!,
    compliance_standard: createBody.compliance_standard!,
    is_active: createBody.is_active!,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  // Step 3: Prepare update data with all fields changed
  const updateBody = {
    policy_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3650>
    >(),
    retention_action: RandomGenerator.pick([
      "delete",
      "archive",
      "anonymize",
    ] as const),
    compliance_standard: RandomGenerator.pick([
      "GDPR",
      "CCPA",
      "HIPAA",
      null,
    ] as const),
    is_active: true,
  } satisfies IDiscussionBoardDataRetentionPolicy.IUpdate;
  // Step 4: Perform the update operation
  const updatedPolicy =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.update(
      superAdminConnection,
      {
        policyId: existingPolicy.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPolicy);
  // Step 5: Validate the update results
  TestValidator.equals(
    "policy ID remains unchanged",
    updatedPolicy.id,
    existingPolicy.id,
  );
  TestValidator.equals(
    "policy name is updated",
    updatedPolicy.policy_name,
    updateBody.policy_name,
  );
  TestValidator.equals(
    "description is updated",
    updatedPolicy.description,
    updateBody.description,
  );
  TestValidator.equals(
    "retention period is updated",
    updatedPolicy.retention_period_days,
    updateBody.retention_period_days,
  );
  TestValidator.equals(
    "retention action is updated",
    updatedPolicy.retention_action,
    updateBody.retention_action,
  );
  TestValidator.equals(
    "compliance standard is updated",
    updatedPolicy.compliance_standard,
    updateBody.compliance_standard,
  );
  TestValidator.predicate(
    "policy remains active",
    updatedPolicy.is_active === true,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedPolicy.updated_at,
    existingPolicy.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedPolicy.created_at,
    existingPolicy.created_at,
  );
  TestValidator.equals(
    "deleted_at should remain null",
    updatedPolicy.deleted_at,
    null,
  );
  // Step 6: Validate retention period boundaries
  TestValidator.predicate(
    "retention period should be within 1-3650 days",
    updatedPolicy.retention_period_days >= 1 &&
      updatedPolicy.retention_period_days <= 3650,
  );
  // Step 7: Validate retention action is valid
  TestValidator.predicate(
    "retention action should be valid type",
    ["delete", "archive", "anonymize"].includes(updatedPolicy.retention_action),
  );
}
