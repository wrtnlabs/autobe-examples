import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEscalationLog";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformEscalationLog";

/**
 * Validate admin search and filtering of escalation logs, including pagination
 * and boundaries.
 *
 * 1. Create and authenticate an admin
 * 2. Create a report category
 * 3. Create a user report (which a member would submit)
 * 4. Escalate the report (create escalation log)
 * 5. Query the escalation logs as admin by:
 *
 *    - Filtering by status
 *    - Filtering by report ID
 *    - Filtering by initiator ID
 *    - Filtering by assigned admin ID (destination_admin_id)
 *    - Filtering by date ranges
 *    - Paginating results and verifying pagination metadata
 *    - Using invalid/out-of-range page to check empty set
 */
export async function test_api_escalation_log_index_admin_access_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register Admin & Login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    },
  });
  typia.assert(admin);
  const adminId = admin.id;

  // 2. Create a Report Category
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }).replace(/ /g, "-"),
          allow_free_text: true,
        },
      },
    );
  typia.assert(reportCategory);

  // 3. Create a Content Report (member)
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(report);

  // 4. Create an escalation log
  const escalationLog =
    await api.functional.communityPlatform.admin.escalationLogs.create(
      connection,
      {
        body: {
          initiator_id: adminId, // admin escalates for this test (could be member/mod in prod)
          report_id: report.id,
          escalation_reason: RandomGenerator.paragraph({ sentences: 3 }),
          destination_admin_id: adminId, // assign to self
          status: "pending",
          resolution_summary: null,
        },
      },
    );
  typia.assert(escalationLog);

  // 5. Search: Filter by status
  let searchResp =
    await api.functional.communityPlatform.admin.escalationLogs.index(
      connection,
      {
        body: {
          status: "pending",
          limit: 10 as number,
        },
      },
    );
  typia.assert(searchResp);
  TestValidator.predicate(
    "all returned logs have status 'pending'",
    searchResp.data.every((log) => log.status === "pending"),
  );
  TestValidator.equals(
    "log with current escalation ID exists in filtered 'pending' set",
    ArrayUtil.has(searchResp.data, (log) => log.id === escalationLog.id),
    true,
  );

  // 6. Filter by report_id (should yield exactly one)
  searchResp =
    await api.functional.communityPlatform.admin.escalationLogs.index(
      connection,
      {
        body: {
          report_id: report.id,
        },
      },
    );
  typia.assert(searchResp);
  TestValidator.equals(
    "exactly one log when filtering by report_id",
    searchResp.data.length,
    1,
  );
  TestValidator.equals(
    "ID matches escalationLog",
    searchResp.data[0]?.id,
    escalationLog.id,
  );

  // 7. Filter by initiator_id (admin)
  searchResp =
    await api.functional.communityPlatform.admin.escalationLogs.index(
      connection,
      {
        body: {
          initiator_id: adminId,
        },
      },
    );
  typia.assert(searchResp);
  TestValidator.predicate(
    "all logs were initiated by admin",
    searchResp.data.every((log) => log.initiator_id === adminId),
  );

  // 8. Filter by destination_admin_id
  searchResp =
    await api.functional.communityPlatform.admin.escalationLogs.index(
      connection,
      {
        body: {
          destination_admin_id: adminId,
        },
      },
    );
  typia.assert(searchResp);
  TestValidator.predicate(
    "all logs assigned to admin",
    searchResp.data.every((log) => log.destination_admin_id === adminId),
  );

  // 9. Date range filter (should include current log)
  const now = new Date();
  const dateFrom = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
  const dateTo = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(); // 1 day later
  searchResp =
    await api.functional.communityPlatform.admin.escalationLogs.index(
      connection,
      {
        body: {
          date_from: dateFrom,
          date_to: dateTo,
        },
      },
    );
  typia.assert(searchResp);
  TestValidator.predicate(
    "date range includes escalation log",
    searchResp.data.some((log) => log.id === escalationLog.id),
  );

  // 10. Pagination: limit 1, get 1st page
  searchResp =
    await api.functional.communityPlatform.admin.escalationLogs.index(
      connection,
      {
        body: {
          limit: 1 as number,
          page: 1 as number,
        },
      },
    );
  typia.assert(searchResp);
  TestValidator.equals("page size is 1", searchResp.data.length, 1);
  TestValidator.equals(
    "pagination object present",
    typeof searchResp.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination current is 1",
    searchResp.pagination.current,
    1,
  );

  // 11. Pagination: request out-of-range page
  searchResp =
    await api.functional.communityPlatform.admin.escalationLogs.index(
      connection,
      {
        body: {
          limit: 1 as number,
          page: 100 as number, // likely out of range
        },
      },
    );
  typia.assert(searchResp);
  TestValidator.equals(
    "no results for out-of-range page",
    searchResp.data.length,
    0,
  );
}
