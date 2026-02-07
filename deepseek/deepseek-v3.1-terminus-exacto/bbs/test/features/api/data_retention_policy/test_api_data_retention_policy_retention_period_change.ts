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

/**
 * Test updating the retention period of an active policy.
 * 1. Create a policy with initial retention period
 * 2. Modify the retention period and verify next_enforcement_due recalculation
 * 3. Validate enforcement scheduling integrity
 */
export async function test_api_data_retention_policy_retention_period_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create active policy with initial retention period
  const initialRetentionPeriod = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
  >();
  const policy =
    await generate_random_discussion_board_super_admin_data_retention_policies_create(
      superAdminConnection,
      {
        body: {
          policy_name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: initialRetentionPeriod,
          retention_action: RandomGenerator.pick([
            "delete",
            "archive",
            "anonymize",
          ] as const),
          compliance_standard: typia.random<string | null | undefined>(),
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy);
  // 3. Update policy with new retention period
  const newRetentionPeriod = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<366> & tags.Maximum<730>
  >();
  const updatedPolicy =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.update(
      superAdminConnection,
      {
        policyId: policy.id,
        body: {
          retention_period_days: newRetentionPeriod,
        } satisfies IDiscussionBoardDataRetentionPolicy.IUpdate,
      },
    );
  typia.assert(updatedPolicy);
  // 4. Validate retention period update
  TestValidator.equals(
    "retention period should be updated",
    updatedPolicy.retention_period_days,
    newRetentionPeriod,
  );
  // 5. Validate next_enforcement_due is properly set
  TestValidator.predicate(
    "next_enforcement_due should be defined",
    updatedPolicy.next_enforcement_due !== null &&
      updatedPolicy.next_enforcement_due !== undefined,
  );
  // 6. Validate other properties remain unchanged
  TestValidator.equals(
    "policy id should remain unchanged",
    updatedPolicy.id,
    policy.id,
  );
  TestValidator.equals(
    "policy name should remain unchanged",
    updatedPolicy.policy_name,
    policy.policy_name,
  );
  TestValidator.equals(
    "retention action should remain unchanged",
    updatedPolicy.retention_action,
    policy.retention_action,
  );
  TestValidator.equals(
    "is_active should remain unchanged",
    updatedPolicy.is_active,
    policy.is_active,
  );
  // 7. Validate that updated_at timestamp is newer
  TestValidator.predicate(
    "updated_at should be newer after modification",
    updatedPolicy.updated_at > policy.updated_at,
  );
}
