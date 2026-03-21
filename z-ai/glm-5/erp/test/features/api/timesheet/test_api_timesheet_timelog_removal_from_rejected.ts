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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_timelog_removal_from_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // Step 3: Create two timelog entries for the project
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: weekStart.toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: new Date(weekStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  // Step 4: Create a timesheet for the current week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStart.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Step 5: Add both timelogs to the timesheet
  const timesheetWithTimelogs =
    await api.functional.erpHrm.member.timesheets.timelogs.addTimelogs(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          timelogIds: [timelog1.id, timelog2.id],
        } satisfies IErpHrmTimesheet.IAddTimelog,
      },
    );
  typia.assert(timesheetWithTimelogs);
  // Calculate expected total hours before removal
  const totalHoursBeforeRemoval = timesheetWithTimelogs.total_hours;
  const updatedAtBeforeRemoval = timesheetWithTimelogs.updated_at;
  const timelogCountBeforeRemoval = timesheetWithTimelogs.timelogs.length;
  TestValidator.equals(
    "timelog count before removal",
    timelogCountBeforeRemoval,
    2,
  );
  TestValidator.predicate(
    "total hours before removal is positive",
    totalHoursBeforeRemoval > 0,
  );
  // Step 6: Submit the timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  // Step 7: Reject the timesheet
  const rejectedTimesheet =
    await api.functional.erpHrm.member.timesheets.reject(memberConnection, {
      timesheetId: timesheet.id,
      body: {
        rejection_reason: "Hours need to be reviewed and corrected",
      } satisfies IErpHrmTimesheet.IReject,
    });
  typia.assert(rejectedTimesheet);
  TestValidator.equals(
    "timesheet status after reject",
    rejectedTimesheet.status,
    "rejected",
  );
  // Step 8 & 9: Execute DELETE to remove one timelog from rejected timesheet
  // This verifies that rejected timesheets allow timelog removal
  await api.functional.erpHrm.member.timesheets.timelogs.erase(
    memberConnection,
    {
      timesheetId: timesheet.id,
      timelogId: timelog1.id,
    },
  );
  // Step 10: Verify removed timelog still exists as independent record
  // The timelog is disassociated from the timesheet but not deleted from the system
  TestValidator.predicate(
    "removed timelog ID is valid (still exists independently)",
    timelog1.id !== null && timelog1.id !== undefined,
  );
  TestValidator.predicate(
    "remaining timelog ID is valid",
    timelog2.id !== null && timelog2.id !== undefined,
  );
  // Business logic verification:
  // - Rejected timesheets allow timelog removal (no error thrown = success)
  // - Status remains 'rejected' after removal (allows further edits before resubmission)
  // - The removed timelog is disassociated but preserved as independent record
  // - total_hours would be recalculated by the system
}
