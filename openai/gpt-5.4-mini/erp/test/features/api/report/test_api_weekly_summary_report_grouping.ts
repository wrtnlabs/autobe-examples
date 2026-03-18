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

export async function test_api_weekly_summary_report_grouping(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const firstRequest = {
    startDate: "2026-03-02",
    endDate: "2026-03-15",
    page: 1,
    limit: 1,
  } satisfies IHrmTimeTrackingWeeklySummaryReport.IRequest;
  const firstPage =
    await api.functional.hrmTimeTracking.member.reports.weekly_summary.index(
      memberConnection,
      { body: firstRequest },
    );
  typia.assert(firstPage);
  const secondRequest = {
    startDate: "2026-03-02",
    endDate: "2026-03-15",
    page: 2,
    limit: 1,
  } satisfies IHrmTimeTrackingWeeklySummaryReport.IRequest;
  const secondPage =
    await api.functional.hrmTimeTracking.member.reports.weekly_summary.index(
      memberConnection,
      { body: secondRequest },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "weekly summary page size respects limit",
    firstPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "weekly summary page size respects limit on second page",
    secondPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "page one current index",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "page two current index",
    secondPage.pagination.current,
    2,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    firstPage.pagination.records >= 0 && secondPage.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination totals remain stable across pages",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "pagination page count remains stable across pages",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  TestValidator.predicate(
    "report response is page-shaped",
    Array.isArray(firstPage.data) && Array.isArray(secondPage.data),
  );
  TestValidator.predicate(
    "pagination only changes returned rows",
    firstPage.data.length <= 1 && secondPage.data.length <= 1,
  );
}
