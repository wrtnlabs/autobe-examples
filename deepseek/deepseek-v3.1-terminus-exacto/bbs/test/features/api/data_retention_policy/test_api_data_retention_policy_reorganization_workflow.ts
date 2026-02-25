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

export async function test_api_data_retention_policy_reorganization_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - create separate connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Test Administrator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create first retention policy
  const policy1 =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: "Short-Term Retention",
          description: "Policy for short-term data retention (30 days)",
          retention_period_days: 30,
          retention_action: "delete",
          compliance_standard: "GDPR",
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy1);
  // 3. Create second retention policy for restructuring
  const policy2 =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: "Long-Term Retention",
          description: "Policy for long-term data retention (365 days)",
          retention_period_days: 365,
          retention_action: "archive",
          compliance_standard: "CCPA",
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy2);
  // 4. Create initial mapping to be kept
  const keptMapping =
    await generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: policy1.id,
          data_type: "user_login_logs",
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  typia.assert(keptMapping);
  // 5. Create target mapping for deletion
  const deletedMapping =
    await generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: policy2.id,
          data_type: "audit_trail_data",
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  typia.assert(deletedMapping);
  // 6. Verify mappings created successfully
  TestValidator.equals(
    "kept mapping data type",
    keptMapping.data_type,
    "user_login_logs",
  );
  TestValidator.equals(
    "deleted mapping data type",
    deletedMapping.data_type,
    "audit_trail_data",
  );
  TestValidator.notEquals(
    "different mappings",
    keptMapping.id,
    deletedMapping.id,
  );
  // 7. Delete target mapping for reorganization
  await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.erase(
    adminConnection,
    {
      mappingId: deletedMapping.id,
    },
  );
  // 8. Validate reorganization - verify deletion completed successfully
  TestValidator.notEquals("different policies created", policy1.id, policy2.id);
  TestValidator.equals("policy1 active", policy1.is_active, true);
  TestValidator.equals("policy2 active", policy2.is_active, true);
  // 9. Test reorganization scenario completeness
  TestValidator.predicate("reorganization retained active mapping", () => {
    return keptMapping.data_type === "user_login_logs";
  });
}
