import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import type { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import type { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_timelogs_create } from "../../../generate/generate_random_hrm_tracker_member_timelogs_create";
import { prepare_random_hrm_tracker_timelog } from "../../../prepare/prepare_random_hrm_tracker_timelog";

export async function test_api_timesheet_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup manager with time:approve permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: RandomGenerator.name() + "@example.com",
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(manager);
  // 2. Setup employee who will submit timesheet
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: RandomGenerator.name() + "@example.com",
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(employee);
  // 3. Create project for the employee
  // Note: This assumes there's an endpoint to create a project in the organization
  // For now, we'll use a random UUID as placeholder since project creation endpoint isn't specified
  const projectId = RandomGenerator.alphaNumeric(36);
  // 4. Employee creates draft timesheet by submitting with status 'draft'
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay()); // Monday
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6); // Sunday
  // Submit as draft first
  const draftTimesheet =
    await api.functional.hrmTracker.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: "draft-tmp-id", // Placeholder, will be updated in next step
        body: {
          status: "draft",
          total_hours: 0,
          rejection_reason: null,
        } satisfies IHrmTrackerTimesheet.IUpdate,
      },
    );
  typia.assert(draftTimesheet);
  // 5. Create timelog for the timesheet
  const timelog = await api.functional.hrmTracker.member.timelogs.create(
    employeeConnection,
    {
      body: {
        date: weekStartDate.toISOString(),
        duration_in_minutes: 480, // 8 hours
        project_id: projectId,
        task_id: null,
        description: "Regular work hours",
        billable: true,
      } satisfies IHrmTrackerTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 6. Update timesheet with timelog and submit for approval
  const submittedTimesheet =
    await api.functional.hrmTracker.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: draftTimesheet.id,
        body: {
          status: "submitted",
          total_hours: 8, // 480 minutes / 60 = 8 hours
          rejection_reason: null,
        } satisfies IHrmTrackerTimesheet.IUpdate,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 7. Manager approves the timesheet
  const approvedTimesheet =
    await api.functional.hrmTracker.member.timesheets.approve(
      managerConnection,
      {
        timesheetId: draftTimesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  // 8. Validate approval results
  TestValidator.equals(
    "timesheet status is approved",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.notEquals(
    "reviewed_at is set",
    approvedTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "reviewer matches manager",
    approvedTimesheet.reviewer?.id,
    manager.id,
  );
}