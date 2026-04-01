import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
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

export async function test_api_timesheet_create_draft_for_current_employee(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(12)}@example.com` satisfies string,
      password: "1234!abcd" satisfies string,
      name: RandomGenerator.name(),
      href: "http://localhost" satisfies string,
      referrer: "http://localhost" satisfies string,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const weekStart = new Date("2026-03-30T00:00:00.000Z");
  const weekEnd = new Date("2026-04-05T23:59:59.999Z");
  const body = {
    weekStartDate: weekStart.toISOString(),
    weekEndDate: weekEnd.toISOString(),
  } satisfies IErpHrmTimeTimesheet.ICreate;
  const output = await api.functional.erpHrmTime.member.timesheets.create(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "timesheet week start preserved",
    output.weekStartDate,
    body.weekStartDate,
  );
  TestValidator.equals(
    "timesheet week end preserved",
    output.weekEndDate,
    body.weekEndDate,
  );
  TestValidator.equals("timesheet starts as draft", output.status, "draft");
  TestValidator.equals("submittedAt initially null", output.submittedAt, null);
  TestValidator.equals("reviewedAt initially null", output.reviewedAt, null);
  TestValidator.equals(
    "rejectionReason initially null",
    output.rejectionReason,
    null,
  );
  TestValidator.equals(
    "reviewedByMember initially null",
    output.reviewedByMember,
    null,
  );
  TestValidator.predicate(
    "timesheet has an owning employee record",
    output.employee !== null,
  );
  TestValidator.predicate(
    "draft timesheet contains only linked timelogs for the same employee",
    output.timesheetTimelogs.every((item) => item.timelog.member !== null),
  );
  TestValidator.predicate(
    "all included timelogs fall within the requested week",
    output.timesheetTimelogs.every((item) => {
      const workDate = new Date(item.timelog.workDate).getTime();
      return workDate >= weekStart.getTime() && workDate <= weekEnd.getTime();
    }),
  );
  TestValidator.equals(
    "attached timelog count matches included associations",
    output.timesheetTimelogs.length,
    output.timesheetTimelogs.filter((item) => item.deleted_at === null).length,
  );
  TestValidator.predicate(
    "API request does not require explicit employee identifiers",
    Object.keys(body).every(
      (key) => key === "weekStartDate" || key === "weekEndDate",
    ),
  );
}
