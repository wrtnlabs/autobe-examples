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

export async function test_api_data_retention_policy_data_type_mapping_duplicate_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish super administrator authentication session
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
  // 2. Create prerequisite data retention policy (GDPR compliance)
  const policy =
    await generate_random_discussion_board_super_admin_data_retention_policies_create(
      superAdminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: RandomGenerator.pick([
            "delete",
            "archive",
            "anonymize",
          ] as const),
          compliance_standard: "GDPR",
          is_active: true,
        },
      },
    );
  typia.assert(policy);
  // 3. Create first successful mapping
  const mapping =
    await generate_random_discussion_board_super_admin_data_retention_policy_data_type_mappings_create(
      superAdminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: policy.id,
          data_type: "user_profiles",
        },
      },
    );
  typia.assert(mapping);
  TestValidator.equals(
    "policy ID matches",
    mapping.retentionPolicy.id,
    policy.id,
  );
  TestValidator.equals("data type matches", mapping.data_type, "user_profiles");
  // 4. Attempt duplicate mapping - should be rejected
  await TestValidator.error(
    "duplicate mapping should be rejected",
    async () => {
      await generate_random_discussion_board_super_admin_data_retention_policy_data_type_mappings_create(
        superAdminConnection,
        {
          body: {
            discussion_board_data_retention_policy_id: policy.id,
            data_type: "user_profiles",
          },
        },
      );
    },
  );
}
