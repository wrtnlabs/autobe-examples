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

export async function test_api_timesheet_approve_submitted_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/signup",
      referrer: "https://example.com/erp",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const memberAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joined.token.access,
    },
  };
  const now: Date = new Date();
  const monday: Date = new Date(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday: Date = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  sunday.setHours(23, 59, 59, 999);
  const draft = await generate_random_erp_hrm_time_member_timesheets_create(
    memberAuthorizedConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
        weekEndDate: sunday.toISOString(),
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(draft);
  TestValidator.predicate(
    "draft timesheet should be submitted before approval",
    draft.status === "submitted",
  );
  TestValidator.predicate(
    "draft timesheet should contain timelogs before approval",
    draft.timesheetTimelogs.length > 0,
  );
  const approved = await api.functional.erpHrmTime.member.timesheets.approve(
    memberAuthorizedConnection,
    {
      timesheetId: draft.id,
    },
  );
  typia.assert(approved);
  TestValidator.equals(
    "timesheet id should remain the same",
    approved.id,
    draft.id,
  );
  TestValidator.equals(
    "employee ownership should remain the same",
    approved.employee,
    draft.employee,
  );
  TestValidator.equals(
    "week start should remain unchanged",
    approved.weekStartDate,
    draft.weekStartDate,
  );
  TestValidator.equals(
    "week end should remain unchanged",
    approved.weekEndDate,
    draft.weekEndDate,
  );
  TestValidator.equals(
    "submitted timestamp should be preserved",
    approved.submittedAt,
    draft.submittedAt,
  );
  TestValidator.predicate(
    "approved status should be returned",
    approved.status === "approved",
  );
  TestValidator.predicate(
    "review timestamp should exist",
    approved.reviewedAt !== null,
  );
  TestValidator.predicate(
    "reviewing member should exist",
    approved.reviewedByMember !== null,
  );
  TestValidator.equals(
    "included timelog associations should be preserved",
    approved.timesheetTimelogs.map((item) => item.timelog.id),
    draft.timesheetTimelogs.map((item) => item.timelog.id),
  );
  const approvedTimelog = approved.timesheetTimelogs[0]!.timelog;
  await TestValidator.error(
    "approved timelog cannot be edited through timesheet lock",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.approve(
        memberAuthorizedConnection,
        {
          timesheetId: approved.id,
        },
      );
    },
  );
  TestValidator.predicate(
    "approved timelog should remain linked after approval",
    approvedTimelog.id === approved.timesheetTimelogs[0]!.timelog.id,
  );
}
