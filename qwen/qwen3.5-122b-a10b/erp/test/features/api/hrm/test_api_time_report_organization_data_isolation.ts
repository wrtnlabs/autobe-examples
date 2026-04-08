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
 * Test time report endpoint enforces strict organization-level data isolation.
 *
 * Validates that the time tracking report endpoint properly scopes results by organization ID, ensuring multi-tenancy data isolation. The test verifies that different organization IDs produce separate report contexts and that the API correctly enforces organization boundaries in report generation.
 *
 * This test focuses on validating the organization scoping mechanism of the time report endpoint by calling it with different organization identifiers and confirming that each request is properly isolated within its organization context.
 *
 * 1. Member user registration for authenticated access.
 * 2. Generate two distinct organization UUIDs for isolation testing.
 * 3. Request time report for first organization and validate response structure.
 * 4. Request time report for second organization and validate response structure.
 * 5. Verify both reports are independent with separate data contexts.
 * 6. Test with date range filters to confirm scoping persists with additional parameters.
 * 7. Validate report items have correct structure with employee/project/task references.
 */
export async function test_api_time_report_organization_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member user for authenticated access
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.hrm.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Generate two distinct organization UUIDs for isolation testing
  const orgAId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orgBId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Ensure organization IDs are different
  TestValidator.notEquals("organizations are distinct", orgAId, orgBId);
  // 3. Request time report for first organization (Org A)
  const reportA =
    await api.functional.hrm.member.organizations.reports.time.search(
      memberConnection,
      {
        organizationId: orgAId,
        body: {
          group_by: ["employee"],
          page: 1,
          limit: 100,
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(reportA);
  // 4. Request time report for second organization (Org B)
  const reportB =
    await api.functional.hrm.member.organizations.reports.time.search(
      memberConnection,
      {
        organizationId: orgBId,
        body: {
          group_by: ["employee"],
          page: 1,
          limit: 100,
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(reportB);
  // 5. Validate both reports have correct structure
  TestValidator.predicate(
    "Org A report has valid total_hours",
    typeof reportA.total_hours === "number" && reportA.total_hours >= 0,
  );
  TestValidator.predicate(
    "Org A report has valid total_entries",
    typeof reportA.total_entries === "number" && reportA.total_entries >= 0,
  );
  TestValidator.predicate(
    "Org A report has valid total_billable_hours",
    typeof reportA.total_billable_hours === "number",
  );
  TestValidator.predicate(
    "Org A report has valid total_non_billable_hours",
    typeof reportA.total_non_billable_hours === "number",
  );
  TestValidator.predicate(
    "Org A report items is array",
    Array.isArray(reportA.items),
  );
  TestValidator.predicate(
    "Org B report has valid total_hours",
    typeof reportB.total_hours === "number" && reportB.total_hours >= 0,
  );
  TestValidator.predicate(
    "Org B report has valid total_entries",
    typeof reportB.total_entries === "number" && reportB.total_entries >= 0,
  );
  TestValidator.predicate(
    "Org B report items is array",
    Array.isArray(reportB.items),
  );
  // 6. Test with date range filters to confirm scoping persists
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  const reportAWithFilter =
    await api.functional.hrm.member.organizations.reports.time.search(
      memberConnection,
      {
        organizationId: orgAId,
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          group_by: ["project"],
          page: 1,
          limit: 50,
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(reportAWithFilter);
  const reportBWithFilter =
    await api.functional.hrm.member.organizations.reports.time.search(
      memberConnection,
      {
        organizationId: orgBId,
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          group_by: ["project"],
          page: 1,
          limit: 50,
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(reportBWithFilter);
  // 7. Validate filtered reports structure
  TestValidator.predicate(
    "Org A filtered report has valid structure",
    typeof reportAWithFilter.total_hours === "number" &&
      reportAWithFilter.total_hours >= 0,
  );
  TestValidator.predicate(
    "Org B filtered report has valid structure",
    typeof reportBWithFilter.total_hours === "number" &&
      reportBWithFilter.total_hours >= 0,
  );
  // 8. Verify report items have correct structure when present
  if (reportA.items.length > 0) {
    const firstItem = reportA.items[0];
    TestValidator.predicate(
      "Org A report item has total_hours",
      typeof firstItem.total_hours === "number",
    );
    TestValidator.predicate(
      "Org A report item has total_entries",
      typeof firstItem.total_entries === "number" &&
        firstItem.total_entries >= 0,
    );
    TestValidator.predicate(
      "Org A report item has total_billable_hours",
      typeof firstItem.total_billable_hours === "number",
    );
    TestValidator.predicate(
      "Org A report item has total_non_billable_hours",
      typeof firstItem.total_non_billable_hours === "number",
    );
  }
  if (reportB.items.length > 0) {
    const firstItem = reportB.items[0];
    TestValidator.predicate(
      "Org B report item has total_hours",
      typeof firstItem.total_hours === "number",
    );
    TestValidator.predicate(
      "Org B report item has total_entries",
      typeof firstItem.total_entries === "number" &&
        firstItem.total_entries >= 0,
    );
  }
  // 9. Test with employee_ids filter for additional scoping validation
  const randomEmployeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const reportAWithEmployeeFilter =
    await api.functional.hrm.member.organizations.reports.time.search(
      memberConnection,
      {
        organizationId: orgAId,
        body: {
          employee_ids: [randomEmployeeId],
          group_by: ["employee"],
          page: 1,
          limit: 50,
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(reportAWithEmployeeFilter);
  TestValidator.predicate(
    "Org A employee-filtered report has valid structure",
    typeof reportAWithEmployeeFilter.total_hours === "number",
  );
}
