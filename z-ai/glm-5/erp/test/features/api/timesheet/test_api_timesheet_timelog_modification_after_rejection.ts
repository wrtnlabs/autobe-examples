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

export async function test_api_timesheet_timelog_modification_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create employee connection and authenticate
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  // 2. Create a project for timelog association
  const project = await generate_random_erp_hrm_member_projects_create(
    employeeConnection,
    { body: { name: RandomGenerator.name(), color_code: "#FF5733" } },
  );
  typia.assert(project);
  // 3. Create multiple timelog entries for the week
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  monday.setHours(0, 0, 0, 0);
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: monday.toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
        >(),
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: new Date(
          monday.getTime() + 1 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
        >(),
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: new Date(
          monday.getTime() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
        >(),
      },
    },
  );
  typia.assert(timelog3);
  // 4. Create a draft timesheet for the week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    { body: { week_start_date: monday.toISOString() } },
  );
  typia.assert(timesheet);
  // Store initial values for later validation
  const initialTimelogIds = timesheet.timelogs.map((t) => t.id);
  // 5. Submit the timesheet for approval
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 6. Reject the timesheet with a reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 3 });
  const rejectedTimesheet =
    await api.functional.erpHrm.member.timesheets.reject(employeeConnection, {
      timesheetId: timesheet.id,
      body: {
        rejection_reason: rejectionReason,
      } satisfies IErpHrmTimesheet.IReject,
    });
  typia.assert(rejectedTimesheet);
  TestValidator.equals(
    "status is rejected",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason preserved",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  // 7. Modify the timesheet - remove one timelog and add another
  const modifiedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.updateTimelogs(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: {
          add: [timelog3.id],
          remove: [timelog2.id],
        } satisfies IErpHrmTimesheet.IUpdateTimelog,
      },
    );
  typia.assert(modifiedTimesheet);
  // 8. Validate modifications on rejected timesheet
  // Status should still be rejected
  TestValidator.equals(
    "status remains rejected after modification",
    modifiedTimesheet.status,
    "rejected",
  );
  // Rejection reason should be preserved
  TestValidator.equals(
    "rejection reason still preserved",
    modifiedTimesheet.rejection_reason,
    rejectionReason,
  );
  // Total hours should be recalculated after modification
  const expectedHours = (timelog1.duration + timelog3.duration) / 60;
  TestValidator.equals(
    "total_hours recalculated",
    modifiedTimesheet.total_hours,
    expectedHours,
  );
  // Timelog associations should reflect modifications
  const modifiedTimelogIds = modifiedTimesheet.timelogs.map((t) => t.id);
  TestValidator.predicate(
    "timelog1 still present",
    modifiedTimelogIds.includes(timelog1.id),
  );
  TestValidator.predicate(
    "timelog2 removed",
    !modifiedTimelogIds.includes(timelog2.id),
  );
  TestValidator.predicate(
    "timelog3 added",
    modifiedTimelogIds.includes(timelog3.id),
  );
  // 9. Verify that the rejected timesheet can be resubmitted after modifications
  const resubmittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(resubmittedTimesheet);
  TestValidator.equals(
    "status is submitted after resubmit",
    resubmittedTimesheet.status,
    "submitted",
  );
}
