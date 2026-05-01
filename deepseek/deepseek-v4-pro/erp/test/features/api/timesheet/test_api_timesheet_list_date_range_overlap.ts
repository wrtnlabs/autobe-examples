import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test timesheet date range filtering with overlapping and non-overlapping periods.
 *
 * Creates a timesheet for a specific Monday-to-Sunday calendar week, then verifies the date range overlap logic by listing timesheets using two different dateRange filters. The overlap check is defined as week_start_date &lt;= dateRange.end AND week_end_date &gt;= dateRange.start, meaning both fully-contained and partially-overlapping weeks are included in results.
 *
 * The first test uses a dateRange whose start falls after the timesheet's week_start_date but whose end is before the timesheet's week_end_date, creating a partial overlap. The timesheet should appear in results, confirming the overlap logic correctly includes partially overlapping weeks.
 *
 * The second test uses a dateRange completely outside the timesheet's calendar week (entirely before the week). The timesheet should be excluded from results, confirming the overlap logic correctly excludes non-overlapping weeks.
 *
 * 1. Member joins and authenticates to access timesheet features.
 * 2. A draft timesheet is created for the week of April 20-26, 2026 (Monday to Sunday).
 * 3. Timesheets are listed with a partially overlapping dateRange of April 22-24, 2026.
 * 4. Verify the created timesheet appears in the overlapping results.
 * 5. Timesheets are listed with a non-overlapping dateRange of April 13-19, 2026.
 * 6. Verify the created timesheet is excluded from the non-overlapping results.
 */
export async function test_api_timesheet_list_date_range_overlap(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a timesheet for the week of April 20-26, 2026 (Monday to Sunday)
  const weekStartDate = "2026-04-20T00:00:00.000Z";
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    { body: { week_start_date: weekStartDate } },
  );
  typia.assert(timesheet);
  // 3. List timesheets with a partially overlapping dateRange
  //    start (April 22) is after week_start_date, end (April 24) is before week_end_date
  const overlapResult = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        dateRange: { start: "2026-04-22", end: "2026-04-24" },
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(overlapResult);
  // 4. Verify the timesheet appears with partial overlap
  TestValidator.predicate(
    "timesheet appears with partial date overlap",
    overlapResult.data.some((ts) => ts.id === timesheet.id),
  );
  // 5. List timesheets with a non-overlapping dateRange (completely before the week)
  const noOverlapResult = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        dateRange: { start: "2026-04-13", end: "2026-04-19" },
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(noOverlapResult);
  // 6. Verify the timesheet is excluded from non-overlapping results
  TestValidator.predicate(
    "timesheet excluded with non-overlapping date range",
    !noOverlapResult.data.some((ts) => ts.id === timesheet.id),
  );
}
