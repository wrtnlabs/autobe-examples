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

export async function test_api_data_retention_policy_data_type_mapping_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Create and authenticate as super admin
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create a data retention policy
  const policy =
    await generate_random_discussion_board_super_admin_data_retention_policies_create(
      superAdminConnection,
      {
        body: {
          policy_name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
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
            null,
          ] as const),
          is_active: true,
        },
      },
    );
  typia.assert(policy);
  // Create data retention policy data type mapping
  const mapping =
    await generate_random_discussion_board_super_admin_data_retention_policy_data_type_mappings_create(
      superAdminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: policy.id,
          data_type: RandomGenerator.pick([
            "user_profiles",
            "article_content",
            "comment_data",
            "audit_logs",
          ] as const),
        },
      },
    );
  typia.assert(mapping);
  // Delete the mapping
  await api.functional.discussionBoard.superAdmin.data_retention_policy_data_type_mappings.erase(
    superAdminConnection,
    {
      mappingId: mapping.id,
    },
  );
  // Verify deletion by attempting to retrieve the mapping and expecting 404 error
  await TestValidator.error(
    "mapping should not exist after deletion",
    async () => {
      await api.functional.discussionBoard.superAdmin.data_retention_policy_data_type_mappings.erase(
        superAdminConnection,
        {
          mappingId: mapping.id,
        },
      );
    },
  );
}
