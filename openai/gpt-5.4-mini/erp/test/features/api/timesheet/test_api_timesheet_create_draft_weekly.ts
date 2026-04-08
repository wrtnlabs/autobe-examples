import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import type { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import type { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_create";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";

export async function test_api_timesheet_create_draft_weekly(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const monday = new Date("2026-03-30T00:00:00.000Z");
  const sunday = new Date("2026-04-05T23:59:59.999Z");
  const timesheet = await api.functional.erpHrmTime.member.timesheets.create(
    memberConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
        weekEndDate: sunday.toISOString(),
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  TestValidator.equals(
    "timesheet week start matches request",
    timesheet.weekStartDate,
    monday.toISOString(),
  );
  TestValidator.equals(
    "timesheet week end matches request",
    timesheet.weekEndDate,
    sunday.toISOString(),
  );
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.equals("submittedAt is null", timesheet.submittedAt, null);
  TestValidator.equals("reviewedAt is null", timesheet.reviewedAt, null);
  TestValidator.equals(
    "rejectionReason is null",
    timesheet.rejectionReason,
    null,
  );
  TestValidator.equals(
    "reviewedByMember is null",
    timesheet.reviewedByMember,
    null,
  );
  TestValidator.predicate(
    "timesheet has an employee",
    () => timesheet.employee !== null && timesheet.employee !== undefined,
  );
  TestValidator.predicate(
    "timesheet employee is scoped to the selected organization",
    () =>
      timesheet.employee.organization !== null &&
      timesheet.employee.organization !== undefined,
  );
  if (timesheet.timesheetTimelogs.length > 0) {
    await ArrayUtil.asyncForEach(timesheet.timesheetTimelogs, async (link) => {
      typia.assert(link);
      typia.assert(link.timelog);
      TestValidator.predicate(
        "linked timelog has an owning member",
        () => link.timelog.member !== null && link.timelog.member !== undefined,
      );
      TestValidator.predicate(
        "linked timelog has a project",
        () =>
          link.timelog.project !== null && link.timelog.project !== undefined,
      );
    });
  }
}
