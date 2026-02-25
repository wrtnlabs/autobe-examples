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

export async function test_api_data_retention_policy_mapping_active_policy_requirement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
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
  // 2. Create an active policy
  const activePolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
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
  typia.assert(activePolicy);
  // 3. Create an inactive policy
  const inactivePolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          retention_action: RandomGenerator.pick([
            "delete",
            "archive",
            "anonymize",
          ] as const),
          compliance_standard: null,
          is_active: false,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(inactivePolicy);
  // 4. Attempt to create mapping with inactive policy ID - expect error
  await TestValidator.error(
    "cannot create mapping for inactive policy",
    async () => {
      await generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create(
        adminConnection,
        {
          body: {
            discussion_board_data_retention_policy_id: inactivePolicy.id,
            data_type: "article_content",
          } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
        },
      );
    },
  );
  // 5. Create a new active policy for successful mapping
  const anotherActivePolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
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
  typia.assert(anotherActivePolicy);
  // 6. Successfully create mapping with active policy ID
  const mapping =
    await generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: anotherActivePolicy.id,
          data_type: "comment_data",
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  typia.assert(mapping);
  // 7. Validate successful mapping creation
  TestValidator.equals(
    "policy id matches",
    mapping.retentionPolicy.id,
    anotherActivePolicy.id,
  );
  TestValidator.predicate(
    "policy is active",
    mapping.retentionPolicy.is_active === true,
  );
}
