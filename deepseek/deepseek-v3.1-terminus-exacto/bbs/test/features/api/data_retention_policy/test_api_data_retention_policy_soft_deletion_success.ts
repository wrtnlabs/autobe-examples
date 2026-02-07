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
 * Test the successful soft deletion of an active data retention policy by a super administrator.
 * Create a GDPR-compliant data retention policy with retention period of 30 days and 'delete' action,
 * then verify that the soft deletion operation completes successfully. While we cannot validate the
 * deleted_at timestamp due to API limitations, the test ensures the deletion operation completes
 * without errors, demonstrating the soft deletion functionality.
 */
export async function test_api_data_retention_policy_soft_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a GDPR-compliant data retention policy
  const policy =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.create(
      superAdminConnection,
      {
        body: {
          policy_name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: 30,
          retention_action: "delete" as const,
          compliance_standard: "GDPR",
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy);
  // Perform soft deletion of the policy
  await api.functional.discussionBoard.superAdmin.data_retention_policies.erase(
    superAdminConnection,
    {
      policyId: policy.id,
    },
  );
  // The operation completes successfully without errors, demonstrating soft deletion functionality
  // Note: Due to API design limitations, we cannot retrieve the deleted policy to validate deleted_at timestamp
}
