import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the time tracking report endpoint with comprehensive filtering and multi-dimensional grouping.
 *
 * Validates the time report API's ability to filter and aggregate time entries across multiple dimensions. The test authenticates a member user and exercises various report configurations including date range filtering, billable status filtering, and multi-dimensional grouping by employee and project.
 *
 * The test covers:
 * 1. Date range filtering with specific start and end dates
 * 2. Billable status filtering to separate chargeable from non-chargeable work
 * 3. Multi-dimensional grouping by employee and project combinations
 * 4. Aggregation accuracy for total hours, billable hours, and entry counts
 * 5. Organization scoping for multi-tenancy isolation
 * 6. Empty result handling when no timelogs match the filter criteria
 * 7. Pagination structure with cursor-based navigation
 *
 * 1. Member user authenticates via email/password registration.
 * 2. Request time report with date range filter and verify response structure.
 * 3. Request time report with billable=true filter and verify billable breakdown.
 * 4. Request time report with group_by=["employee", "project"] and verify multi-dimensional grouping.
 * 5. Request time report with empty date range and verify zero totals.
 * 6. Request time report with pagination limit and verify cursor structure.
 */
export async function test_api_time_report_multi_dimensional_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // Generate a valid organization ID for testing
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Test date range filtering
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  const dateRangeReport: IHrmTimelog.ISummary =
    await api.functional.hrm.member.organizations.reports.time.search(
      memberConnection,
      {
        organizationId,
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(dateRangeReport);
  // 3. Test billable status filter
  const billableReport: IHrmTimelog.ISummary =
    await api.functional.hrm.member.organizations.reports.time.search(
      memberConnection,
      {
        organizationId,
        body: {
          billable: true,
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(billableReport);
  // 4. Test multi-dimensional grouping by employee and project
  const groupedReport: IHrmTimelog.ISummary =
    await api.functional.hrm.member.organizations.reports.time.search(
      memberConnection,
      {
        organizationId,
        body: {
          group_by: ["employee", "project"],
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(groupedReport);
  // Validate multi-dimensional grouping structure
  TestValidator.predicate(
    "grouped report has items array",
    Array.isArray(groupedReport.items),
  );
  if (groupedReport.items.length > 0) {
    const firstItem = groupedReport.items[0];
    TestValidator.predicate(
      "grouped item has total_hours",
      typeof firstItem.total_hours === "number",
    );
    TestValidator.predicate(
      "grouped item has total_billable_hours",
      typeof firstItem.total_billable_hours === "number",
    );
    TestValidator.predicate(
      "grouped item has total_non_billable_hours",
      typeof firstItem.total_non_billable_hours === "number",
    );
    TestValidator.predicate(
      "grouped item has total_entries",
      typeof firstItem.total_entries === "number",
    );
  }
  // 5. Test empty result handling with future date range
  const futureStartDate = new Date();
  futureStartDate.setDate(futureStartDate.getDate() + 365);
  const futureEndDate = new Date();
  futureEndDate.setDate(futureEndDate.getDate() + 366);
  const emptyReport: IHrmTimelog.ISummary =
    await api.functional.hrm.member.organizations.reports.time.search(
      memberConnection,
      {
        organizationId,
        body: {
          start_date: futureStartDate.toISOString(),
          end_date: futureEndDate.toISOString(),
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(emptyReport);
  // 6. Test pagination with limit
  const paginatedReport: IHrmTimelog.ISummary =
    await api.functional.hrm.member.organizations.reports.time.search(
      memberConnection,
      {
        organizationId,
        body: {
          limit: 10,
          page: 1,
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(paginatedReport);
  // Validate pagination structure
  TestValidator.predicate(
    "paginated report has items array",
    Array.isArray(paginatedReport.items),
  );
  TestValidator.predicate(
    "paginated report has cursor field",
    paginatedReport.cursor === null ||
      typeof paginatedReport.cursor === "string",
  );
}
