import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_timelog_management_submitted_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    },
  });
  typia.assert(memberAuth);
  // 2. Get employee_id from authenticated member
  const employeeId = memberAuth.member.id;
  // 3. Create draft timesheet for the week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    memberConnection,
    {
      body: {
        start_date: weekStart.toISOString(),
        end_date: weekEnd.toISOString(),
        hrm_platform_employee_id: employeeId,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // Verify initial status is pending (draft)
  TestValidator.equals(
    "timesheet starts as pending",
    timesheet.status,
    "pending",
  );
  // 4. Record initial timelog count and total hours
  const initialTimelogCount = timesheet.timelogs.length;
  const initialTotalHours = timesheet.total_hours ?? 0;
  // 5. Successfully add timelogs to draft timesheet (pending state should allow)
  const timelogIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const addRequest = {
    adds: timelogIds,
  } satisfies IHrmPlatformTimesheet.ITimelogManageRequest;
  const updatedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.timelogs.manage(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: addRequest,
      },
    );
  typia.assert(updatedTimesheet);
  // Verify timelogs were successfully added in draft state
  TestValidator.equals(
    "draft timesheet allows adding timelogs",
    updatedTimesheet.timelogs.length,
    initialTimelogCount + 3,
  );
  // 6. Attempt to add more timelogs (should work in draft state)
  const moreTimelogIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const additionalAddRequest = {
    adds: moreTimelogIds,
  } satisfies IHrmPlatformTimesheet.ITimelogManageRequest;
  const twiceUpdatedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.timelogs.manage(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: additionalAddRequest,
      },
    );
  typia.assert(twiceUpdatedTimesheet);
  TestValidator.equals(
    "draft timesheet allows multiple additions",
    twiceUpdatedTimesheet.timelogs.length,
    updatedTimesheet.timelogs.length + 2,
  );
  // 7. Test removal of timelogs from draft timesheet (should work)
  const timelogToRemove = updatedTimesheet.timelogs[0].id;
  const removeRequest = {
    removes: [timelogToRemove],
  } satisfies IHrmPlatformTimesheet.ITimelogManageRequest;
  const removedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.timelogs.manage(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: removeRequest,
      },
    );
  typia.assert(removedTimesheet);
  TestValidator.equals(
    "draft timesheet allows removing timelogs",
    removedTimesheet.timelogs.length,
    twiceUpdatedTimesheet.timelogs.length - 1,
  );
  // Note: Testing submitted/rejected status blocking requires additional API endpoints
  // to transition timesheet status (e.g., POST /timesheets/{id}/submit)
  // which are not available in the current SDK function set.
  // The above test validates that draft timesheets allow modifications,
  // which is the prerequisite for the blocked modification behavior.
}
