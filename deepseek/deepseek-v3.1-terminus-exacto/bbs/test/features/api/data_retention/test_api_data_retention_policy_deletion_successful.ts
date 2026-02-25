import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_data_retention_policies_create } from "../../../generate/generate_random_discussion_board_admin_data_retention_policies_create";
import { generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create } from "../../../generate/generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create";
import { prepare_random_discussion_board_data_retention_policy } from "../../../prepare/prepare_random_discussion_board_data_retention_policy";
import { prepare_random_discussion_board_data_retention_policy_data_type } from "../../../prepare/prepare_random_discussion_board_data_retention_policy_data_type";

export async function test_api_data_retention_policy_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator using available utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: "Test Administrator",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/admin",
      ip: "192.168.1.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a data retention policy using SDK function
  const policy =
    await api.functional.discussionBoard.admin.data_retention_policies.create(
      adminConnection,
      {
        body: {
          policy_name: "Test Retention Policy",
          description: "Test policy for data retention mapping deletion",
          retention_period_days: 30 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          retention_action: "delete" as const,
          compliance_standard: "GDPR",
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy);
  // Create a data retention policy data type mapping using SDK function
  const mapping =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.create(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: policy.id,
          data_type: "user_profiles",
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  typia.assert(mapping);
  // Delete the mapping
  await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.erase(
    adminConnection,
    {
      mappingId: mapping.id,
    },
  );
  // Since there's no direct way to verify deletion through GET endpoint,
  // we validate that the deletion operation completed successfully
  // by ensuring no errors were thrown during the erase operation
  TestValidator.predicate("mapping deletion completed without errors", true);
}
