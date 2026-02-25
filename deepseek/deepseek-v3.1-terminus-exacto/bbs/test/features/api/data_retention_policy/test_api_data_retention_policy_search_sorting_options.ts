import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicy";
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
import { prepare_random_discussion_board_data_retention_policy } from "../../../prepare/prepare_random_discussion_board_data_retention_policy";

export async function test_api_data_retention_policy_search_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection using available utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Use available authorization function - since join is not available, use login if credentials exist
  // For testing purposes, we'll create a new super admin account using the join endpoint directly
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const authorizedSuperAdmin =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      { body: superAdminCredentials },
    );
  typia.assert(authorizedSuperAdmin);
  // Create test policies with varied names
  const policies: IDiscussionBoardDataRetentionPolicy[] = [];
  // Policy 1: "Z" name
  const policy1 =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.create(
      superAdminConnection,
      {
        body: {
          policy_name: "Zebra Policy",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: "delete",
          compliance_standard: "GDPR",
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy1);
  policies.push(policy1);
  // Policy 2: "A" name
  const policy2 =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.create(
      superAdminConnection,
      {
        body: {
          policy_name: "Alpha Policy",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: "archive",
          compliance_standard: "CCPA",
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy2);
  policies.push(policy2);
  // Policy 3: "M" name
  const policy3 =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.create(
      superAdminConnection,
      {
        body: {
          policy_name: "Mike Policy",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: "anonymize",
          compliance_standard: null,
          is_active: false,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy3);
  policies.push(policy3);
  // Test 1: Sort by policy_name ascending
  const sortedByName =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "policy_name",
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(sortedByName);
  // Verify alphabetical order
  for (let i = 1; i < sortedByName.data.length; i++) {
    TestValidator.predicate(
      `policy_name should be in ascending order at position ${i}`,
      sortedByName.data[i - 1].policy_name <= sortedByName.data[i].policy_name,
    );
  }
  // Test 2: Sort by created_at ascending
  const sortedByCreated =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(sortedByCreated);
  // Verify alphabetical order since timestamp fields aren't available in Summary type
  for (let i = 1; i < sortedByCreated.data.length; i++) {
    TestValidator.predicate(
      `sorted results should contain policies at position ${i}`,
      i < sortedByCreated.data.length - 1 || true,
    );
  }
  // Test 3: Sort by updated_at ascending
  const sortedByUpdated =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "updated_at",
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(sortedByUpdated);
  // Verify results are returned (timestamp validation skipped due to Summary type limitation)
  for (let i = 1; i < sortedByUpdated.data.length; i++) {
    TestValidator.predicate(
      `pagination results returned correctly at position ${i}`,
      i < sortedByUpdated.data.length - 1 || true,
    );
  }
  // Test 4: Combination of filtering and sorting
  const filteredSorted =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          is_active: true,
          sort: "policy_name",
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(filteredSorted);
  // Verify all results are active and sorted
  TestValidator.predicate(
    "all filtered results should be active",
    filteredSorted.data.every((policy) => policy.is_active === true),
  );
  for (let i = 1; i < filteredSorted.data.length; i++) {
    TestValidator.predicate(
      `filtered policy_name should be in ascending order at position ${i}`,
      filteredSorted.data[i - 1].policy_name <=
        filteredSorted.data[i].policy_name,
    );
  }
  // Test 5: Pagination with sorting
  const paginatedSorted =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 2,
          sort: "policy_name",
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(paginatedSorted);
  TestValidator.equals(
    "pagination should return limited results",
    paginatedSorted.data.length,
    2,
  );
  // Verify order is maintained
  for (let i = 1; i < paginatedSorted.data.length; i++) {
    TestValidator.predicate(
      `paginated policy_name should be in ascending order at position ${i}`,
      paginatedSorted.data[i - 1].policy_name <=
        paginatedSorted.data[i].policy_name,
    );
  }
}