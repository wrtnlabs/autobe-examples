import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
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
import { generate_random_discussion_board_super_admin_data_retention_policies_create } from "../../../generate/generate_random_discussion_board_super_admin_data_retention_policies_create";
import { prepare_random_discussion_board_data_retention_policy } from "../../../prepare/prepare_random_discussion_board_data_retention_policy";

export async function test_api_data_retention_policy_activation_deactivation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial inactive policy
  const initialPolicy =
    await generate_random_discussion_board_super_admin_data_retention_policies_create(
      superAdminConnection,
      {
        body: {
          policy_name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<7300>
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
          ] as const),
          is_active: false,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(initialPolicy);
  // Verify initial inactive state
  TestValidator.equals(
    "initial policy is inactive",
    initialPolicy.is_active,
    false,
  );
  TestValidator.equals(
    "no next_enforcement_due when inactive",
    initialPolicy.next_enforcement_due,
    null,
  );
  // Activate the policy
  const activatedPolicy =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.update(
      superAdminConnection,
      {
        policyId: initialPolicy.id,
        body: {
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.IUpdate,
      },
    );
  typia.assert(activatedPolicy);
  // Verify activation
  TestValidator.equals("policy is now active", activatedPolicy.is_active, true);
  TestValidator.notEquals(
    "next_enforcement_due is set",
    activatedPolicy.next_enforcement_due,
    null,
  );
  TestValidator.predicate(
    "next_enforcement_due is in the future",
    activatedPolicy.next_enforcement_due! > new Date().toISOString(),
  );
  // Verify other settings remain unchanged
  TestValidator.equals(
    "policy_name unchanged",
    activatedPolicy.policy_name,
    initialPolicy.policy_name,
  );
  TestValidator.equals(
    "description unchanged",
    activatedPolicy.description,
    initialPolicy.description,
  );
  TestValidator.equals(
    "retention_period_days unchanged",
    activatedPolicy.retention_period_days,
    initialPolicy.retention_period_days,
  );
  TestValidator.equals(
    "retention_action unchanged",
    activatedPolicy.retention_action,
    initialPolicy.retention_action,
  );
  TestValidator.equals(
    "compliance_standard unchanged",
    activatedPolicy.compliance_standard,
    initialPolicy.compliance_standard,
  );
  // Deactivate the policy
  const deactivatedPolicy =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.update(
      superAdminConnection,
      {
        policyId: initialPolicy.id,
        body: {
          is_active: false,
        } satisfies IDiscussionBoardDataRetentionPolicy.IUpdate,
      },
    );
  typia.assert(deactivatedPolicy);
  // Verify deactivation
  TestValidator.equals(
    "policy is now inactive",
    deactivatedPolicy.is_active,
    false,
  );
  TestValidator.equals(
    "next_enforcement_due cleared when inactive",
    deactivatedPolicy.next_enforcement_due,
    null,
  );
  // Verify all other settings remain unchanged
  TestValidator.equals(
    "policy_name still unchanged",
    deactivatedPolicy.policy_name,
    initialPolicy.policy_name,
  );
  TestValidator.equals(
    "description still unchanged",
    deactivatedPolicy.description,
    initialPolicy.description,
  );
  TestValidator.equals(
    "retention_period_days still unchanged",
    deactivatedPolicy.retention_period_days,
    initialPolicy.retention_period_days,
  );
  TestValidator.equals(
    "retention_action still unchanged",
    deactivatedPolicy.retention_action,
    initialPolicy.retention_action,
  );
  TestValidator.equals(
    "compliance_standard still unchanged",
    deactivatedPolicy.compliance_standard,
    initialPolicy.compliance_standard,
  );
}