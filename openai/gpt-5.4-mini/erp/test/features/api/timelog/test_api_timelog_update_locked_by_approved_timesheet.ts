import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timelog_update_locked_by_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const workDate = new Date();
  workDate.setUTCHours(10, 0, 0, 0);
  const timelogBody = {
    project_id: typia.random<string & tags.Format<"uuid">>(),
    task_id: undefined,
    work_date: workDate.toISOString(),
    duration_minutes: 60,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    billable: true,
  } satisfies IHrmTimeTrackingTimelog.ICreate;
  const created = await api.functional.hrmTimeTracking.member.timelogs.create(
    memberConnection,
    {
      body: timelogBody,
    },
  );
  typia.assert(created);
  const originalTimelog = created;
  const weekStartDate = new Date(workDate);
  weekStartDate.setUTCHours(0, 0, 0, 0);
  const dayIndex = weekStartDate.getUTCDay();
  const mondayOffset = (dayIndex + 6) % 7;
  weekStartDate.setUTCDate(weekStartDate.getUTCDate() - mondayOffset);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);
  weekEndDate.setUTCHours(23, 59, 59, 999);
  const timesheet =
    await api.functional.hrmTimeTracking.member.timesheets.create(
      memberConnection,
      {
        body: {
          weekStart: weekStartDate.toISOString().slice(0, 10),
          weekEnd: weekEndDate.toISOString().slice(0, 10),
          timelogIds: [created.id],
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  const submitted =
    await api.functional.hrmTimeTracking.member.timesheets.submit.process(
      memberConnection,
      { timesheetId: timesheet.id },
    );
  typia.assert(submitted);
  const approved =
    await api.functional.hrmTimeTracking.member.timesheets.approve(
      memberConnection,
      { timesheetId: timesheet.id },
    );
  typia.assert(approved);
  const updateBody = {
    project_id: typia.random<string & tags.Format<"uuid">>(),
    task_id: null,
    work_date: new Date(workDate.getTime() + 60 * 60 * 1000).toISOString(),
    duration_minutes: 90,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    billable: false,
  } satisfies IHrmTimeTrackingTimelog.IUpdate;
  await TestValidator.httpError(
    "locked timelog cannot be updated after approved timesheet",
    [400, 403, 409, 422],
    async () => {
      await api.functional.hrmTimeTracking.member.timelogs.update(
        memberConnection,
        {
          timelogId: originalTimelog.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "timelog id remains unchanged",
    created.id,
    originalTimelog.id,
  );
  TestValidator.equals(
    "timelog project remains unchanged",
    created.project.id,
    originalTimelog.project.id,
  );
  TestValidator.equals(
    "timelog task remains unchanged",
    created.task?.id,
    originalTimelog.task?.id,
  );
  TestValidator.equals(
    "timelog work date remains unchanged",
    created.work_date,
    originalTimelog.work_date,
  );
  TestValidator.equals(
    "timelog duration remains unchanged",
    created.duration_minutes,
    originalTimelog.duration_minutes,
  );
  TestValidator.equals(
    "timelog description remains unchanged",
    created.description,
    originalTimelog.description,
  );
  TestValidator.equals(
    "timelog billable remains unchanged",
    created.billable,
    originalTimelog.billable,
  );
}
