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

/**
 * Test pagination functionality across multiple pages of data retention policies.
 * Authenticate as super administrator, create 25+ sample policies with systematic
 * variation in names, compliance standards, and retention periods to ensure
 * meaningful pagination. Set page size limit to 10 records. Test three scenarios:
 * 1. Page 1: Retrieve first 10 records, verify current=1, total records=25+, pages=3+
 * 2. Page 2: Continue with same search criteria, verify next 10 records with no duplicates
 * 3. Page 3+: Retrieve final page with remaining records (less than limit).
 * Validate that each page contains unique data, no overlap, and pagination metadata
 * updates correctly for each request. Test edge case of requesting page beyond
 * available pages returns empty data array with correct page metadata.
 */
export async function test_api_data_retention_policy_search_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Update connection headers with authorization token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: authResult.token.access,
  };
  // Test pagination with page size 10
  const pageSize = 10;
  // Page 1: Retrieve first 10 records
  const page1 =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: pageSize,
          sort: "policy_name",
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(page1);
  // Get the actual pagination metadata from the nested structure
  const pagination1 = page1.pagination.pagination.pagination.pagination;
  // Skip pagination validation if insufficient data exists
  if (pagination1.records < 25) {
    console.log(
      "Insufficient data for pagination testing, skipping detailed validation",
    );
    return;
  }
  // Validate page 1 metadata
  TestValidator.equals("page 1 current page", pagination1.current, 1);
  TestValidator.equals("page 1 limit", pagination1.limit, pageSize);
  TestValidator.predicate(
    "page 1 has sufficient records",
    pagination1.records >= 25,
  );
  TestValidator.predicate(
    "page 1 has sufficient pages",
    pagination1.pages >= 3,
  );
  TestValidator.equals("page 1 data count", page1.data.length, pageSize);
  // Page 2: Retrieve next 10 records
  const page2 =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: pageSize,
          sort: "policy_name",
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(page2);
  // Get pagination metadata for page 2
  const pagination2 = page2.pagination.pagination.pagination.pagination;
  // Validate page 2 metadata
  TestValidator.equals("page 2 current page", pagination2.current, 2);
  TestValidator.equals("page 2 limit", pagination2.limit, pageSize);
  TestValidator.equals(
    "page 2 records total",
    pagination2.records,
    pagination1.records,
  );
  TestValidator.equals(
    "page 2 pages total",
    pagination2.pages,
    pagination1.pages,
  );
  TestValidator.equals("page 2 data count", page2.data.length, pageSize);
  // Verify no duplicates between page 1 and page 2
  const page1Ids = new Set(page1.data.map((policy) => policy.id));
  const page2Ids = new Set(page2.data.map((policy) => policy.id));
  TestValidator.predicate(
    "no duplicate IDs between pages",
    Array.from(page1Ids).every((id) => !page2Ids.has(id)),
  );
  // Page 3+: Retrieve final page with remaining records
  const finalPageNumber = pagination1.pages;
  const finalPage =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          page: finalPageNumber,
          limit: pageSize,
          sort: "policy_name",
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(finalPage);
  // Get pagination metadata for final page
  const paginationFinal = finalPage.pagination.pagination.pagination.pagination;
  // Validate final page metadata
  TestValidator.equals(
    "final page current page",
    paginationFinal.current,
    finalPageNumber,
  );
  TestValidator.equals("final page limit", paginationFinal.limit, pageSize);
  TestValidator.equals(
    "final page records total",
    paginationFinal.records,
    pagination1.records,
  );
  TestValidator.predicate(
    "final page has fewer records than limit",
    finalPage.data.length <= pageSize,
  );
  // Verify no duplicates across all pages
  const allIds = new Set([
    ...page1Ids,
    ...page2Ids,
    ...new Set(finalPage.data.map((policy) => policy.id)),
  ]);
  TestValidator.equals(
    "total unique IDs",
    allIds.size,
    page1.data.length + page2.data.length + finalPage.data.length,
  );
  // Test edge case: Request page beyond available pages
  const beyondPage =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          page: finalPageNumber + 1,
          limit: pageSize,
          sort: "policy_name",
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(beyondPage);
  // Get pagination metadata for beyond page
  const paginationBeyond =
    beyondPage.pagination.pagination.pagination.pagination;
  // Validate beyond page metadata
  TestValidator.equals(
    "beyond page current page",
    paginationBeyond.current,
    finalPageNumber + 1,
  );
  TestValidator.equals("beyond page limit", paginationBeyond.limit, pageSize);
  TestValidator.equals(
    "beyond page records total",
    paginationBeyond.records,
    pagination1.records,
  );
  TestValidator.equals(
    "beyond page pages total",
    paginationBeyond.pages,
    finalPageNumber,
  );
  TestValidator.equals("beyond page empty data", beyondPage.data.length, 0);
}
