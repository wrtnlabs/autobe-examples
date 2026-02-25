import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
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
import { generate_random_discussion_board_super_admin_data_retention_policies_create } from "../../../generate/generate_random_discussion_board_super_admin_data_retention_policies_create";
import { generate_random_discussion_board_super_admin_data_retention_policy_data_type_mappings_create } from "../../../generate/generate_random_discussion_board_super_admin_data_retention_policy_data_type_mappings_create";
import { prepare_random_discussion_board_data_retention_policy } from "../../../prepare/prepare_random_discussion_board_data_retention_policy";
import { prepare_random_discussion_board_data_retention_policy_data_type } from "../../../prepare/prepare_random_discussion_board_data_retention_policy_data_type";

export async function test_api_data_retention_policy_data_type_mapping_update_successful_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create two data retention policies
  const initialPolicy =
    await generate_random_discussion_board_super_admin_data_retention_policies_create(
      superAdminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: RandomGenerator.pick([
            "delete",
            "archive",
            "anonymize",
          ] as const),
          compliance_standard: RandomGenerator.pick([
            "GDPR",
            "CCPA",
            "PIPEDA",
          ] as const),
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(initialPolicy);
  const targetPolicy =
    await generate_random_discussion_board_super_admin_data_retention_policies_create(
      superAdminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: RandomGenerator.pick([
            "delete",
            "archive",
            "anonymize",
          ] as const),
          compliance_standard: RandomGenerator.pick([
            "GDPR",
            "CCPA",
            "PIPEDA",
          ] as const),
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(targetPolicy);
  // 3. Create initial mapping
  const initialMapping =
    await generate_random_discussion_board_super_admin_data_retention_policy_data_type_mappings_create(
      superAdminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: initialPolicy.id,
          data_type: RandomGenerator.pick([
            "user_profiles",
            "article_content",
            "comment_data",
            "audit_logs",
          ] as const),
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  typia.assert(initialMapping);
  // 4. Update mapping to reassign to target policy
  const updatedMapping =
    await api.functional.discussionBoard.superAdmin.data_retention_policy_data_type_mappings.update(
      superAdminConnection,
      {
        mappingId: initialMapping.id,
        body: {
          discussion_board_data_retention_policy_id: targetPolicy.id,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IUpdate,
      },
    );
  typia.assert(updatedMapping);
  // 5. Validate mapping record updates
  TestValidator.equals(
    "mapping ID remains consistent",
    updatedMapping.id,
    initialMapping.id,
  );
  TestValidator.equals(
    "data type remains unchanged",
    updatedMapping.data_type,
    initialMapping.data_type,
  );
  TestValidator.equals(
    "retention policy ID updated",
    updatedMapping.retentionPolicy.id,
    targetPolicy.id,
  );
  TestValidator.notEquals(
    "retention policy changed",
    updatedMapping.retentionPolicy.id,
    initialPolicy.id,
  );
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    new Date(updatedMapping.updated_at) > new Date(initialMapping.updated_at),
  );
  TestValidator.predicate(
    "created_at remains same",
    updatedMapping.created_at === initialMapping.created_at,
  );
  // 6. Validate retention policy summary information
  TestValidator.equals(
    "retention policy name matches",
    updatedMapping.retentionPolicy.policy_name,
    targetPolicy.policy_name,
  );
  TestValidator.equals(
    "retention period matches",
    updatedMapping.retentionPolicy.retention_period_days,
    targetPolicy.retention_period_days,
  );
  TestValidator.equals(
    "retention action matches",
    updatedMapping.retentionPolicy.retention_action,
    targetPolicy.retention_action,
  );
  TestValidator.predicate(
    "retention policy is active",
    updatedMapping.retentionPolicy.is_active === true,
  );
}
