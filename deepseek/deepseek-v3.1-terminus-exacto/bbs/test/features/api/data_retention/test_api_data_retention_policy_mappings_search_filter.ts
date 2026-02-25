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

/**
 * Test data retention policy mappings search functionality with various filters
 */
export async function test_api_data_retention_policy_mappings_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create multiple data retention policies
  const policies = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
          >(),
          retention_action: RandomGenerator.pick([
            "delete",
            "archive",
            "anonymize",
          ] as const),
          compliance_standard: RandomGenerator.pick([
            "GDPR",
            "CCPA",
            "HIPAA",
            null,
          ]),
          is_active: true,
        },
      },
    );
  });
  // Create multiple data type mappings for each policy
  const dataTypes = [
    "user_profiles",
    "article_content",
    "comment_data",
    "audit_logs",
    "system_backups",
  ];
  const mappings = [];
  for (const policy of policies) {
    const policyMappings = await ArrayUtil.asyncRepeat(2, async () => {
      return await generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create(
        adminConnection,
        {
          body: {
            discussion_board_data_retention_policy_id: policy.id,
            data_type: RandomGenerator.pick(dataTypes),
          },
        },
      );
    });
    mappings.push(...policyMappings);
  }
  // Test 1: Search by exact policy ID
  const searchByPolicyId =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: policies[0].id,
        },
      },
    );
  typia.assert(searchByPolicyId);
  TestValidator.predicate(
    "policy ID search returns results",
    searchByPolicyId.data.length > 0,
  );
  TestValidator.predicate(
    "all results match policy ID",
    searchByPolicyId.data.every(
      (mapping) => mapping.retentionPolicy.id === policies[0].id,
    ),
  );
  // Test 2: Search by data type partial match
  const searchByDataType =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          data_type: "user",
        },
      },
    );
  typia.assert(searchByDataType);
  TestValidator.predicate(
    "data type search returns results",
    searchByDataType.data.length > 0,
  );
  TestValidator.predicate(
    "all results contain data type substring",
    searchByDataType.data.every((mapping) =>
      mapping.data_type.includes("user"),
    ),
  );
  // Test 3: Search with creation date range
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const searchByDateRange =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          created_at_from: yesterday,
          created_at_to: tomorrow,
        },
      },
    );
  typia.assert(searchByDateRange);
  TestValidator.predicate(
    "date range search returns results",
    searchByDateRange.data.length > 0,
  );
  // Test 4: Search with sorting by created_at descending
  const searchSorted =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(searchSorted);
  TestValidator.predicate(
    "sorted search returns results",
    searchSorted.data.length > 0,
  );
  // Verify sorting order (dates should be in descending order)
  if (searchSorted.data.length > 1) {
    for (let i = 0; i < searchSorted.data.length - 1; i++) {
      const current = new Date(searchSorted.data[i].created_at).getTime();
      const next = new Date(searchSorted.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "results sorted in descending order",
        current >= next,
      );
    }
  }
  // Test 5: Search with pagination
  const searchPaginated =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(searchPaginated);
  TestValidator.predicate(
    "paginated search returns limited results",
    searchPaginated.data.length <= 2,
  );
  // Test 6: Verify policy join information
  const randomMapping = searchByPolicyId.data[0];
  TestValidator.equals(
    "mapping has valid policy join",
    randomMapping.retentionPolicy.id,
    policies[0].id,
  );
  TestValidator.equals(
    "policy name matches",
    randomMapping.retentionPolicy.policy_name,
    policies[0].policy_name,
  );
  TestValidator.equals(
    "retention period matches",
    randomMapping.retentionPolicy.retention_period_days,
    policies[0].retention_period_days,
  );
  TestValidator.equals(
    "retention action matches",
    randomMapping.retentionPolicy.retention_action,
    policies[0].retention_action,
  );
  // Test 7: Empty search (should return all non-deleted records)
  const emptySearch =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns all mappings",
    emptySearch.data.length >= mappings.length,
  );
}
