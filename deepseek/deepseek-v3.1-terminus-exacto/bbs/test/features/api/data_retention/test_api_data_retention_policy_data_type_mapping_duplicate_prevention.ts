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

export async function test_api_data_retention_policy_data_type_mapping_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a retention policy
  const policy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
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
          compliance_standard: null,
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy);
  // Create first mapping
  const firstMapping =
    await generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: policy.id,
          data_type: "user_profiles",
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  typia.assert(firstMapping);
  // Create second mapping with different data type
  const secondMapping =
    await generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: policy.id,
          data_type: "article_content",
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  typia.assert(secondMapping);
  // Attempt to update second mapping to create duplicate combination
  await TestValidator.error(
    "duplicate policy-data type combination should be rejected",
    async () => {
      await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.update(
        adminConnection,
        {
          mappingId: secondMapping.id,
          body: {
            data_type: "user_profiles",
          } satisfies IDiscussionBoardDataRetentionPolicyDataType.IUpdate,
        },
      );
    },
  );
  // Verify that the duplicate prevention worked by ensuring the system maintains data integrity
  TestValidator.equals(
    "first mapping should remain unchanged",
    firstMapping.data_type,
    "user_profiles",
  );
  TestValidator.equals(
    "second mapping should remain unchanged",
    secondMapping.data_type,
    "article_content",
  );
}
