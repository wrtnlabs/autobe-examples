import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicyDataType";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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

export async function test_api_data_retention_policy_mappings_inactive_policy_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
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
  // Create active retention policy
  const activePolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: RandomGenerator.pick([
            "delete",
            "archive",
            "anonymize",
          ]),
          compliance_standard: RandomGenerator.pick([
            "GDPR",
            "CCPA",
            "LGPD",
            null,
          ]),
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(activePolicy);
  // Create inactive retention policy
  const inactivePolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: RandomGenerator.pick([
            "delete",
            "archive",
            "anonymize",
          ]),
          compliance_standard: RandomGenerator.pick([
            "GDPR",
            "CCPA",
            "LGPD",
            null,
          ]),
          is_active: true, // Create as active first
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(inactivePolicy);
  // Deactivate the second policy
  await api.functional.discussionBoard.admin.data_retention_policies.erase(
    adminConnection,
    {
      policyId: inactivePolicy.id,
    },
  );
  // Create mappings for active policy
  const activeMapping1 =
    await generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: activePolicy.id,
          data_type: RandomGenerator.pick([
            "user_profiles",
            "article_content",
            "comment_data",
            "audit_logs",
          ]),
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  typia.assert(activeMapping1);
  const activeMapping2 =
    await generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: activePolicy.id,
          data_type: RandomGenerator.pick([
            "user_profiles",
            "article_content",
            "comment_data",
            "audit_logs",
          ]),
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  typia.assert(activeMapping2);
  // Create mapping for inactive policy
  const inactiveMapping =
    await generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: inactivePolicy.id,
          data_type: RandomGenerator.pick([
            "user_profiles",
            "article_content",
            "comment_data",
            "audit_logs",
          ]),
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  typia.assert(inactiveMapping);
  // Test 1: Search by active policy ID should return mappings
  const activePolicySearch =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: activePolicy.id,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(activePolicySearch);
  TestValidator.equals(
    "active policy mappings count",
    activePolicySearch.data.length,
    2,
  );
  TestValidator.predicate("should contain active mappings", () =>
    activePolicySearch.data.some((mapping) => mapping.id === activeMapping1.id),
  );
  TestValidator.predicate("should contain active mappings", () =>
    activePolicySearch.data.some((mapping) => mapping.id === activeMapping2.id),
  );
  // Test 2: Search by inactive policy ID should return empty results
  const inactivePolicySearch =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: inactivePolicy.id,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(inactivePolicySearch);
  TestValidator.equals(
    "inactive policy mappings count",
    inactivePolicySearch.data.length,
    0,
  );
  // Test 3: Search by non-existent policy ID should return empty results
  const nonExistentSearch =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(nonExistentSearch);
  TestValidator.equals(
    "non-existent policy mappings count",
    nonExistentSearch.data.length,
    0,
  );
  // Test 4: Search without policy filter should return all mappings
  const allMappingsSearch =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(allMappingsSearch);
  TestValidator.predicate("should find active mappings", () =>
    allMappingsSearch.data.some((mapping) => mapping.id === activeMapping1.id),
  );
  TestValidator.predicate("should find active mappings", () =>
    allMappingsSearch.data.some((mapping) => mapping.id === activeMapping2.id),
  );
  // Test 5: Verify error handling for invalid UUID format
  await TestValidator.error("invalid UUID format", async () => {
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id:
            "invalid-uuid-format" as any,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  });
}
