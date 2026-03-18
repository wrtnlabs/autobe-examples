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

export async function test_api_timelog_delete_blocked_by_timesheet_lock(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const submittedAt = new Date().toISOString();
  const weekStart = submittedAt.substring(0, 10);
  const firstTimelog =
    await api.functional.hrmTimeTracking.member.timelogs.create(
      memberConnection,
      {
        body: {
          project_id: typia.random<string & tags.Format<"uuid">>(),
          work_date: submittedAt,
          duration_minutes: 60,
          billable: true,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(firstTimelog);
  const draftTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.create(
      memberConnection,
      {
        body: {
          weekStart,
          timelogIds: [firstTimelog.id],
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(draftTimesheet);
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit.process(
      memberConnection,
      {
        timesheetId: draftTimesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  await TestValidator.error(
    "deleting a timelog locked by a submitted timesheet must fail",
    async () => {
      await api.functional.hrmTimeTracking.member.timelogs.erase(
        memberConnection,
        {
          timelogId: firstTimelog.id,
        },
      );
    },
  );
  const secondTimelog =
    await api.functional.hrmTimeTracking.member.timelogs.create(
      memberConnection,
      {
        body: {
          project_id: typia.random<string & tags.Format<"uuid">>(),
          work_date: new Date().toISOString(),
          duration_minutes: 45,
          billable: false,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(secondTimelog);
  const secondTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.create(
      memberConnection,
      {
        body: {
          weekStart,
          timelogIds: [secondTimelog.id],
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(secondTimesheet);
  const secondSubmittedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit.process(
      memberConnection,
      {
        timesheetId: secondTimesheet.id,
      },
    );
  typia.assert(secondSubmittedTimesheet);
  await TestValidator.error(
    "deleting a timelog locked by another submitted timesheet must fail",
    async () => {
      await api.functional.hrmTimeTracking.member.timelogs.erase(
        memberConnection,
        {
          timelogId: secondTimelog.id,
        },
      );
    },
  );
}
