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

/**
 * Test successful timesheet submission workflow.
 *
 * Validates the complete timesheet submission flow from member authentication through project creation, draft timesheet creation, timelog addition, and final submission. Ensures that a properly populated draft timesheet can be submitted and transitions to "submitted" status with all relevant metadata recorded.
 *
 * 1. Member authenticates via join to establish session.
 * 2. Active project is created for timelog association.
 * 3. Draft timesheet is created for the current calendar week.
 * 4. Timelog is added to the draft timesheet against the project.
 * 5. Timesheet is submitted for review.
 * 6. Validates status transition to "submitted", submission timestamp recorded, week boundaries preserved, and timelogs present.
 */
export async function test_api_timesheet_submit_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a draft timesheet for the current week
  const weekStartDate = "2026-04-27T00:00:00.000Z";
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: { week_start_date: weekStartDate },
    },
  );
  typia.assert(timesheet);
  TestValidator.equals("initial status is draft", timesheet.status, "draft");
  TestValidator.equals(
    "submitted_at initially null",
    timesheet.submitted_at,
    null,
  );
  // 4. Add a timelog to the draft timesheet
  const timelogDate = "2026-04-28";
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: timelogDate,
          duration_minutes: 60,
        },
        params: { timesheetId: timesheet.id },
      },
    );
  typia.assert(timelog);
  // 5. Submit the timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // 6. Validate submission result
  TestValidator.equals(
    "status transitions to submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is recorded",
    submittedTimesheet.submitted_at !== null,
  );
  TestValidator.equals(
    "week start date preserved",
    submittedTimesheet.week_start_date,
    timesheet.week_start_date,
  );
  TestValidator.equals(
    "week end date preserved",
    submittedTimesheet.week_end_date,
    timesheet.week_end_date,
  );
  TestValidator.equals(
    "timesheet id preserved",
    submittedTimesheet.id,
    timesheet.id,
  );
  TestValidator.predicate(
    "has associated timelogs",
    submittedTimesheet.timelogs.length > 0,
  );
}
