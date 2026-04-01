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

export async function test_api_timesheet_submit_draft_to_submitted(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com` satisfies string,
      password: "password123!" satisfies string,
      name: RandomGenerator.name(),
      href: "https://example.com/register" satisfies string,
      referrer: "https://example.com/" satisfies string,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const weekStart = new Date("2026-03-30T00:00:00.000Z");
  const weekEnd = new Date("2026-04-05T23:59:59.999Z");
  const draft = await generate_random_erp_hrm_time_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(draft);
  TestValidator.predicate(
    "draft has at least one timelog",
    draft.timesheetTimelogs.length > 0,
  );
  const draftTimelogIds = draft.timesheetTimelogs.map(
    (association) => association.timelog.id,
  );
  const submitted = await api.functional.erpHrmTime.member.timesheets.submit(
    memberConnection,
    {
      timesheetId: draft.id,
    },
  );
  typia.assert(submitted);
  TestValidator.equals("timesheet id preserved", submitted.id, draft.id);
  TestValidator.equals(
    "employee preserved",
    submitted.employee,
    draft.employee,
  );
  TestValidator.equals(
    "week start preserved",
    submitted.weekStartDate,
    draft.weekStartDate,
  );
  TestValidator.equals(
    "week end preserved",
    submitted.weekEndDate,
    draft.weekEndDate,
  );
  TestValidator.equals("status submitted", submitted.status, "submitted");
  TestValidator.notEquals("no longer draft", submitted.status, "draft");
  TestValidator.predicate(
    "submittedAt populated",
    submitted.submittedAt !== null,
  );
  TestValidator.equals("reviewedAt unset", submitted.reviewedAt, null);
  TestValidator.equals(
    "rejectionReason unset",
    submitted.rejectionReason,
    null,
  );
  TestValidator.equals(
    "timelog association count preserved",
    submitted.timesheetTimelogs.length,
    draft.timesheetTimelogs.length,
  );
  TestValidator.equals(
    "included timelog ids preserved",
    submitted.timesheetTimelogs.map((association) => association.timelog.id),
    draftTimelogIds,
  );
  await TestValidator.error("duplicate submit rejected", async () => {
    await api.functional.erpHrmTime.member.timesheets.submit(memberConnection, {
      timesheetId: submitted.id,
    });
  });
}
