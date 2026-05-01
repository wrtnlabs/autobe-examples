import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { generate_random_erp_hrm_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_rejection_draft_status_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as employee
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an active project for timelog tracking
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Compute a Monday date for the timesheet's week_start_date
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysToMonday,
  );
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  const mondayStr = `${y}-${m}-${d}T00:00:00.000Z`;
  // 4. Create a draft timesheet — intentionally do NOT submit
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: { week_start_date: mondayStr },
    },
  );
  typia.assert(timesheet);
  // 5. Add a timelog to the draft timesheet so it has content
  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);
  const tuesdayStr = `${tuesday.getFullYear()}-${String(tuesday.getMonth() + 1).padStart(2, "0")}-${String(tuesday.getDate()).padStart(2, "0")}`;
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: tuesdayStr,
        },
        params: { timesheetId: timesheet.id },
      },
    );
  typia.assert(timelog);
  // 6. Attempt to reject the draft timesheet — expect 409 Conflict
  await TestValidator.httpError(
    "reject draft timesheet should return 409",
    409,
    async () => {
      await api.functional.erpHrm.member.timesheets.reject(memberConnection, {
        timesheetId: timesheet.id,
        body: {
          rejection_reason: "Timesheet needs revision before submission",
        } satisfies IErpHrmTimesheet.IReject,
      });
    },
  );
  // 7. Confirm timesheet remains in draft status and no review metadata written
  TestValidator.equals(
    "timesheet status remains draft",
    timesheet.status,
    "draft",
  );
  TestValidator.equals("reviewed_at is null", timesheet.reviewed_at, null);
  TestValidator.equals(
    "reviewedByUser is null",
    timesheet.reviewedByUser,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    timesheet.rejection_reason,
    null,
  );
}
