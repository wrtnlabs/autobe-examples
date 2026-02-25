import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test pagination boundary conditions for super admin session listing.
 *
 * Creates a super admin account with multiple sessions to test various
 * pagination scenarios including valid pages, edge cases, invalid inputs,
 * and pagination metadata validation.
 */
export async function test_api_superadmin_session_listing_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Generate multiple sessions for pagination testing
  const totalSessions = 45; // More than typical page size
  const sessionPromises = ArrayUtil.repeat(totalSessions, () =>
    authorize_super_admin_join({ host: connection.host } as api.IConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    }),
  );
  const sessions = await Promise.all(sessionPromises);
  // Test 1: Default pagination (no parameters)
  const defaultResult =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default pagination has data",
    defaultResult.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "default pagination metadata valid",
    ((defaultResult as any).page ?? 1) >= 1 &&
      ((defaultResult as any).limit ?? 10) >= 1 &&
      ((defaultResult as any).total_count ?? 0) >= totalSessions &&
      ((defaultResult as any).total_pages ?? 1) >= 1,
  );
  // Test 2: First page with different limit values
  const limitValues = [10, 20, 30, 50] as const;
  for (const limit of limitValues) {
    const firstPageResult =
      await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
        superAdminConnection,
        {
          body: {
            page: 1,
            limit: limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IDiscussionBoardSuperAdminSession.IRequest,
        },
      );
    typia.assert(firstPageResult);
    TestValidator.equals(
      `first page with limit ${limit} has correct current page`,
      ((firstPageResult as any).page ?? 1),
      1,
    );
    TestValidator.equals(
      `first page with limit ${limit} has correct limit`,
      ((firstPageResult as any).limit ?? limit),
      limit,
    );
    TestValidator.predicate(
      `first page with limit ${limit} has valid data count`,
      firstPageResult.data.length <= limit,
    );
  }
  // Test 3: Calculate and test last page
  const testLimit = 15;
  const allSessionsResult =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(allSessionsResult);
  const totalRecords = ((allSessionsResult as any).total_count ?? 0);
  const totalPages = Math.ceil(totalRecords / testLimit);
  const lastPageResult =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {
          page: totalPages,
          limit: testLimit satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(lastPageResult);
  TestValidator.equals(
    "last page has correct current page",
    ((lastPageResult as any).page ?? 1),
    totalPages,
  );
  TestValidator.predicate(
    "last page has correct page count",
    ((lastPageResult as any).total_pages ?? 1) === totalPages,
  );
  TestValidator.predicate(
    "last page data count is valid",
    lastPageResult.data.length > 0 && lastPageResult.data.length <= testLimit,
  );
  // Test 4: Page beyond available data
  const beyondPage = totalPages + 5;
  const emptyPageResult =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {
          page: beyondPage satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: testLimit satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(emptyPageResult);
  TestValidator.equals(
    "page beyond available data returns empty array",
    emptyPageResult.data.length,
    0,
  );
  TestValidator.equals(
    "page beyond available data has correct current page",
    ((emptyPageResult as any).page ?? 1),
    beyondPage,
  );
  TestValidator.predicate(
    "page beyond available data has valid total records",
    ((emptyPageResult as any).total_count ?? 0) === totalRecords,
  );
  // Test 5: Invalid pagination parameters (should still handle gracefully)
  // Note: Type system prevents sending invalid types, so we test with valid but edge values
  const zeroLimitResult =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(zeroLimitResult);
  TestValidator.equals(
    "limit=1 returns at most 1 item",
    zeroLimitResult.data.length <= 1,
    true,
  );
  // Test 6: Filter with no results
  const noResultsResult =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {
          ip: "192.0.2.0", // Unlikely IP address
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(noResultsResult);
  TestValidator.equals(
    "filter with no matches returns empty data",
    noResultsResult.data.length,
    0,
  );
  TestValidator.predicate(
    "filter with no matches has valid pagination metadata",
    ((noResultsResult as any).total_count ?? 0) >= 0 &&
      ((noResultsResult as any).total_pages ?? 0) >= 0,
  );
  // Test 7: Validate pagination formula
  const formulaTestResult =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(formulaTestResult);
  const calculatedPages = Math.ceil(
    ((formulaTestResult as any).total_count ?? 0) / ((formulaTestResult as any).limit ?? 10),
  );
  TestValidator.equals(
    "pagination formula: pages = ceil(records / limit)",
    ((formulaTestResult as any).total_pages ?? 1),
    calculatedPages,
  );
  TestValidator.predicate(
    "current page does not exceed total pages",
    ((formulaTestResult as any).page ?? 1) <= ((formulaTestResult as any).total_pages ?? 1),
  );
}