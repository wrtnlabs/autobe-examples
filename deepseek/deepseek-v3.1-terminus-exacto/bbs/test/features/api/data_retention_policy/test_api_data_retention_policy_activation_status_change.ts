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

/**
 * Test data retention policy activation status change functionality.
 * Uses simulation mode to test status toggle validation.
 * 1. Authenticate as super admin using the provided utility function
 * 2. Test activation status toggle on an existing policy (simulation)
 * 3. Validate timestamps: updated_at changes, created_at remains unchanged
 * 4. Verify other policy fields remain consistent during status changes
 */
export async function test_api_data_retention_policy_activation_status_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // Generate a valid policy ID for testing
  const policyId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test deactivating an active policy (simulation)
  const originalPolicy = {
    id: policyId,
    policy_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    retention_period_days: typia.random<number & tags.Type<"int32">>(),
    retention_action: "delete",
    compliance_standard: "GDPR" as string | null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IDiscussionBoardDataRetentionPolicy;
  // Record original timestamps
  const originalCreatedAt = originalPolicy.created_at;
  const originalUpdatedAt = originalPolicy.updated_at;
  // 3. Test deactivation: Change status from active to inactive
  const deactivateBody = {
    is_active: false,
  } satisfies IDiscussionBoardDataRetentionPolicy.IUpdate;
  const deactivatedPolicy =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.update(
      superAdminConnection,
      {
        policyId: policyId,
        body: deactivateBody,
      },
    );
  typia.assert(deactivatedPolicy);
  // Validate deactivated policy
  TestValidator.predicate(
    "policy should be inactive after deactivation",
    deactivatedPolicy.is_active === false,
  );
  TestValidator.equals(
    "created_at should remain unchanged after deactivation",
    deactivatedPolicy.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should change after deactivation",
    deactivatedPolicy.updated_at !== originalUpdatedAt,
  );
  // Validate that retention period remains unchanged
  TestValidator.equals(
    "retention period unchanged after deactivation",
    deactivatedPolicy.retention_period_days,
    originalPolicy.retention_period_days,
  );
  // 4. Test reactivation: Change status from inactive to active
  const reactivateBody = {
    is_active: true,
  } satisfies IDiscussionBoardDataRetentionPolicy.IUpdate;
  const reactivatedPolicy =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.update(
      superAdminConnection,
      {
        policyId: policyId,
        body: reactivateBody,
      },
    );
  typia.assert(reactivatedPolicy);
  // Validate reactivated policy
  TestValidator.predicate(
    "policy should be active after reactivation",
    reactivatedPolicy.is_active === true,
  );
  TestValidator.equals(
    "created_at should remain unchanged after reactivation",
    reactivatedPolicy.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should change after reactivation",
    reactivatedPolicy.updated_at !== deactivatedPolicy.updated_at,
  );
  // 5. Validate all other fields remain consistent throughout status changes
  TestValidator.equals(
    "retention period consistent throughout tests",
    reactivatedPolicy.retention_period_days,
    originalPolicy.retention_period_days,
  );
  TestValidator.equals(
    "policy_name unchanged",
    reactivatedPolicy.policy_name,
    originalPolicy.policy_name,
  );
  TestValidator.equals(
    "description unchanged",
    reactivatedPolicy.description,
    originalPolicy.description,
  );
  TestValidator.equals(
    "retention_action unchanged",
    reactivatedPolicy.retention_action,
    originalPolicy.retention_action,
  );
  // Note: Enforcement scheduling (next_enforcement_due) validation not possible
  // as it's not part of the public DTO structure. System handles this internally.
}
