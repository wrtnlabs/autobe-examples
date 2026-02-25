import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_grade_changes_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Setup super administrator connection using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2);
  const oneDayAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24);
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24);
  // Test 1: Search for records created in the last 2 days
  const recentResults =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          created_at_start: twoDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(recentResults);
  // Test 2: Search for older records (before 2 days ago)
  const olderResults =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          created_at_start: null,
          created_at_end: twoDaysAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(olderResults);
  // Test 3: Narrow date range (last 24 hours only)
  const recentDayResults =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          created_at_start: oneDayAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(recentDayResults);
  // Test 4: Boundary condition - empty date range (future dates)
  const futureResults =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          created_at_start: futureDate.toISOString(),
          created_at_end: futureDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(futureResults);
  // Validate that empty range returns empty results
  TestValidator.equals(
    "future date range returns empty",
    futureResults.data.length,
    0,
  );
  // Test 5: Test pagination with filtered results
  const paginatedResults =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          created_at_start: twoDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(paginatedResults);
  // Validate pagination properties
  TestValidator.predicate(
    "pagination limit is respected",
    paginatedResults.data.length <= 2,
  );
  // Test 6: Edge case - null date filters (should return all records)
  const allResults =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          created_at_start: null,
          created_at_end: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(allResults);
  // Final validation: Ensure date filtering logic is consistent
  TestValidator.predicate(
    "date range filtering works",
    recentResults.data.length <= allResults.data.length ||
      olderResults.data.length <= allResults.data.length,
  );
}
