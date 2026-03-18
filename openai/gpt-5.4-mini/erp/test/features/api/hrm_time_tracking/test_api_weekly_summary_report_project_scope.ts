import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IHrmTimeTrackingWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingWeeklySummaryReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
import type { IPageIHrmTimeTrackingWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_weekly_summary_report_project_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const fromDate = "2026-03-09";
  const toDate = "2026-03-15";
  const scopedProjectId = typia.random<string & tags.Format<"uuid">>();
  const scopedReport =
    await api.functional.hrmTimeTracking.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          startDate: fromDate,
          endDate: toDate,
          project_id: scopedProjectId,
          page: 1,
          limit: 50,
        } satisfies IHrmTimeTrackingWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(scopedReport);
  const broadReport =
    await api.functional.hrmTimeTracking.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          startDate: fromDate,
          endDate: toDate,
          page: 1,
          limit: 50,
        } satisfies IHrmTimeTrackingWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(broadReport);
  TestValidator.equals(
    "scoped pagination current",
    scopedReport.pagination.current,
    1,
  );
  TestValidator.equals(
    "scoped pagination limit",
    scopedReport.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "scoped pagination records are non-negative",
    scopedReport.pagination.records >= 0,
  );
  TestValidator.predicate(
    "scoped pagination pages are non-negative",
    scopedReport.pagination.pages >= 0,
  );
  TestValidator.equals(
    "broad pagination current",
    broadReport.pagination.current,
    1,
  );
  TestValidator.equals(
    "broad pagination limit",
    broadReport.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "broad pagination records are non-negative",
    broadReport.pagination.records >= 0,
  );
  TestValidator.predicate(
    "broad pagination pages are non-negative",
    broadReport.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "scoped report rows use summary flags",
    scopedReport.data.every(
      (row) =>
        typeof row.weekStart === "boolean" &&
        typeof row.weekEnd === "boolean" &&
        typeof row.totalHours === "boolean" &&
        typeof row.timelogCount === "boolean" &&
        typeof row.employeeCount === "boolean",
    ),
  );
  TestValidator.predicate(
    "broad report rows use summary flags",
    broadReport.data.every(
      (row) =>
        typeof row.weekStart === "boolean" &&
        typeof row.weekEnd === "boolean" &&
        typeof row.totalHours === "boolean" &&
        typeof row.timelogCount === "boolean" &&
        typeof row.employeeCount === "boolean",
    ),
  );
  TestValidator.predicate(
    "scoped report is not larger than broad report in row count",
    scopedReport.data.length <= broadReport.data.length,
  );
}
