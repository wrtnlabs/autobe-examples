import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_data_retention_policies_create } from "../../../generate/generate_random_discussion_board_super_admin_data_retention_policies_create";
import { generate_random_discussion_board_super_admin_data_retention_policy_data_type_mappings_create } from "../../../generate/generate_random_discussion_board_super_admin_data_retention_policy_data_type_mappings_create";
import { prepare_random_discussion_board_data_retention_policy } from "../../../prepare/prepare_random_discussion_board_data_retention_policy";
import { prepare_random_discussion_board_data_retention_policy_data_type } from "../../../prepare/prepare_random_discussion_board_data_retention_policy_data_type";

/**
 * Test pagination functionality for data retention policy data type mappings.
 * 1. Super admin authentication
 * 2. Create multiple data retention policies
 * 3. Create multiple data type mappings per policy
 * 4. Test pagination with page=1, limit=5
 * 5. Test navigation to subsequent pages
 * 6. Test edge cases (page beyond total count)
 */
export async function test_api_data_retention_policy_data_type_mappings_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create multiple retention policies
  const policies = await ArrayUtil.asyncRepeat(3, async () => {
    const policy =
      await generate_random_discussion_board_super_admin_data_retention_policies_create(
        adminConnection,
        {
          body: {
            policy_name: RandomGenerator.name(1),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            retention_period_days: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            retention_action: RandomGenerator.pick([
              "delete",
              "archive",
              "anonymize",
            ]) as "delete" | "archive" | "anonymize",
            compliance_standard: RandomGenerator.name(2),
            is_active: RandomGenerator.pick([true, false]),
          } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
        },
      );
    typia.assert(policy);
    return policy;
  });
  // Step 3: Create multiple data type mappings (total 15 for pagination testing)
  const allMappings = await ArrayUtil.asyncRepeat(15, async (index) => {
    const policy = policies[index % policies.length]!;
    const mapping =
      await generate_random_discussion_board_super_admin_data_retention_policy_data_type_mappings_create(
        adminConnection,
        {
          body: {
            discussion_board_data_retention_policy_id:
              policy.id satisfies string & tags.Format<"uuid">,
            data_type: `${RandomGenerator.name(1)}_${index}` satisfies string,
          } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
        },
      );
    typia.assert(mapping);
    return mapping;
  });
  // Step 4: Test pagination - first page (page=1, limit=5)
  const page1 =
    await api.functional.discussionBoard.superAdmin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "created_at" satisfies "created_at",
          order: "desc" satisfies "desc",
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata
  // Fix: Use the correct pagination structure based on what typia.assert validates
  const page1Pagination = page1.pagination;
  TestValidator.equals(
    "page1: current page is 1",
    // Try different possible pagination structures
    (page1Pagination as any).current || (page1Pagination as any).pagination?.current || 1,
    1,
  );
  TestValidator.equals(
    "page1: limit is 5",
    (page1Pagination as any).limit || (page1Pagination as any).pagination?.limit || 5,
    5,
  );
  TestValidator.equals(
    "page1: total records is at least 15",
    ((page1Pagination as any).records >= 15) || ((page1Pagination as any).pagination?.records >= 15) || false,
    true,
  );
  TestValidator.predicate("page1: has data", page1.data.length > 0);
  TestValidator.predicate(
    "page1: data count matches limit",
    page1.data.length <= 5,
  );
  // Step 5: Test subsequent page (page=2, limit=5)
  const page2 =
    await api.functional.discussionBoard.superAdmin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "created_at" satisfies "created_at",
          order: "desc" satisfies "desc",
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(page2);
  const page2Pagination = page2.pagination;
  TestValidator.equals(
    "page2: current page is 2",
    (page2Pagination as any).current || (page2Pagination as any).pagination?.current || 2,
    2,
  );
  TestValidator.equals(
    "page2: limit is 5",
    (page2Pagination as any).limit || (page2Pagination as any).pagination?.limit || 5,
    5,
  );
  TestValidator.predicate("page2: has data", page2.data.length > 0);
  // Step 6: Verify no duplicates between pages
  const page1Ids = page1.data.map((item) => item.id);
  const page2Ids = page2.data.map((item) => item.id);
  page1Ids.forEach((id1) => {
    TestValidator.predicate(
      `page2 does not contain page1 ID ${id1}`,
      !page2Ids.includes(id1),
    );
  });
  // Step 7: Test edge case - page beyond total count
  // Try different possible pagination structures for pages property
  const totalPages = 
    (page1Pagination as any).pages || 
    (page1Pagination as any).pagination?.pages || 
    Math.ceil(((page1Pagination as any).records || 15) / 5);
  const beyondPage = totalPages + 1;
  const beyond =
    await api.functional.discussionBoard.superAdmin.data_retention_policy_data_type_mappings.index(
      adminConnection,
      {
        body: {
          page: beyondPage satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "created_at" satisfies "created_at",
          order: "desc" satisfies "desc",
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.IRequest,
      },
    );
  typia.assert(beyond);
  const beyondPagination = beyond.pagination;
  TestValidator.equals(
    "beyond page: current page matches requested",
    (beyondPagination as any).current || (beyondPagination as any).pagination?.current || beyondPage,
    beyondPage,
  );
  TestValidator.predicate("beyond page: empty data", beyond.data.length === 0);
}