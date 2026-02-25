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

export async function test_api_data_retention_policy_data_type_mapping_update_data_type_change(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a data retention policy
  const policy =
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
          compliance_standard: null,
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy);
  // Create initial data type mapping with 'user_profiles' (valid system category)
  const initialMapping =
    await generate_random_discussion_board_super_admin_data_retention_policy_data_type_mappings_create(
      superAdminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: policy.id,
          data_type: "user_profiles",
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  typia.assert(initialMapping);
  // Verify initial mapping has correct data type and policy association
  TestValidator.equals(
    "initial mapping data type",
    initialMapping.data_type,
    "user_profiles",
  );
  TestValidator.equals(
    "initial mapping policy ID",
    initialMapping.retentionPolicy.id,
    policy.id,
  );
  // Update the mapping to change data type to 'article_content' (valid system category)
  const updatedMapping =
    await api.functional.discussionBoard.superAdmin.data_retention_policy_data_type_mappings.update(
      superAdminConnection,
      {
        mappingId: initialMapping.id,
        body: {
          data_type: "article_content",
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IUpdate,
      },
    );
  typia.assert(updatedMapping);
  // Verify the update was successful - data type changed, policy association maintained
  TestValidator.equals(
    "mapping ID unchanged",
    updatedMapping.id,
    initialMapping.id,
  );
  TestValidator.equals(
    "data type changed to article_content",
    updatedMapping.data_type,
    "article_content",
  );
  TestValidator.equals(
    "retention policy association maintained",
    updatedMapping.retentionPolicy.id,
    policy.id,
  );
  TestValidator.notEquals(
    "data type is different from original",
    updatedMapping.data_type,
    "user_profiles",
  );
  // Test duplicate mapping prevention - same policy + data type combination should fail
  await TestValidator.error("duplicate mapping prevention", async () => {
    await generate_random_discussion_board_super_admin_data_retention_policy_data_type_mappings_create(
      superAdminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: policy.id,
          data_type: "article_content",
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  });
}
