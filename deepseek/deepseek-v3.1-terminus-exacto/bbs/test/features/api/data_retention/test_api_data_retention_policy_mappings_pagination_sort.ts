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

export async function test_api_data_retention_policy_mappings_pagination_sort(
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
  // Create multiple data retention policies
  const policies = await ArrayUtil.asyncRepeat(15, async () => {
    return await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 1 }),
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
            null,
          ] as const),
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  });
  // Create multiple mappings with different data types
  const dataTypes = [
    "user_profiles",
    "article_content",
    "comment_data",
    "audit_logs",
    "system_logs",
  ] as const;
  const mappings = await ArrayUtil.asyncRepeat(25, async () => {
    return await generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id:
            RandomGenerator.pick(policies).id,
          data_type: RandomGenerator.pick(dataTypes),
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  });
  // Test pagination with default page size
  const firstPage =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page should have data",
    firstPage.data.length > 0,
    true,
  );
  TestValidator.equals(
    "page limit should be respected",
    firstPage.data.length <= 10,
    true,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    ((firstPage as any).pagination?.page ?? 1) === 1 &&
      ((firstPage as any).pagination?.size ?? 10) === 10 &&
      ((firstPage as any).pagination?.total ?? 0) >= 25 &&
      ((firstPage as any).pagination?.total_pages ?? 0) >= 3,
  );
  // Test second page
  const secondPage =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page should have data",
    secondPage.data.length > 0,
    true,
  );
  TestValidator.notEquals(
    "first and second page data should differ",
    firstPage.data[0]?.id,
    secondPage.data[0]?.id,
  );
  // Test sorting by created_at ascending
  const sortedByCreatedAsc =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          order: "asc",
          limit: 25,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(sortedByCreatedAsc);
  // Verify ascending order by checking consecutive dates
  if (sortedByCreatedAsc.data.length > 1) {
    for (let i = 1; i < sortedByCreatedAsc.data.length; i++) {
      const prevDate = new Date(sortedByCreatedAsc.data[i - 1].created_at);
      const currDate = new Date(sortedByCreatedAsc.data[i].created_at);
      TestValidator.predicate(
        `item ${i} should be after item ${i - 1} in ascending order`,
        prevDate <= currDate,
      );
    }
  }
  // Test sorting by created_at descending
  const sortedByCreatedDesc =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          limit: 25,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(sortedByCreatedDesc);
  // Verify descending order by checking consecutive dates
  if (sortedByCreatedDesc.data.length > 1) {
    for (let i = 1; i < sortedByCreatedDesc.data.length; i++) {
      const prevDate = new Date(sortedByCreatedDesc.data[i - 1].created_at);
      const currDate = new Date(sortedByCreatedDesc.data[i].created_at);
      TestValidator.predicate(
        `item ${i} should be before item ${i - 1} in descending order`,
        prevDate >= currDate,
      );
    }
  }
  TestValidator.notEquals(
    "ascending and descending should differ",
    sortedByCreatedAsc.data[0]?.id,
    sortedByCreatedDesc.data[0]?.id,
  );
  // Test sorting by data_type
  const sortedByDataType =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          sort: "data_type",
          order: "asc",
          limit: 25,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(sortedByDataType);
  // Verify data_type alphabetical order
  if (sortedByDataType.data.length > 1) {
    for (let i = 1; i < sortedByDataType.data.length; i++) {
      const prevType = sortedByDataType.data[i - 1].data_type;
      const currType = sortedByDataType.data[i].data_type;
      TestValidator.predicate(
        `data_type ${prevType} should come before ${currType} in alphabetical order`,
        prevType <= currType,
      );
    }
  }
  // Test filtering by data type
  const filteredByType =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          data_type: "user_profiles",
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(filteredByType);
  TestValidator.predicate(
    "filtered results should match data type",
    filteredByType.data.every(
      (mapping) => mapping.data_type === "user_profiles",
    ),
  );
  // Test empty result set with non-matching filter
  const emptyResults =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          data_type: "non_existent_type",
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "non-matching filter should return empty",
    emptyResults.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should show zero records",
    ((emptyResults as any).pagination?.total ?? 0),
    0,
  );
}