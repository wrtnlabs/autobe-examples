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

export async function test_api_timesheet_update_draft_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Create an active project for timelogs
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
      } satisfies DeepPartial<IErpHrmProject.ICreate>,
    },
  );
  typia.assert(project);
  // 3. Calculate a work week (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  // Create multiple timelogs within the same work week
  const timelogIds: string[] = [];
  const timelogDurations: number[] = [];
  for (let i = 0; i < 3; i++) {
    const timelogDate = new Date(monday);
    timelogDate.setDate(monday.getDate() + i);
    const duration = (60 + i * 30) satisfies number as number;
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: timelogDate.toISOString(),
          duration: duration satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
          billable: true,
        } satisfies DeepPartial<IErpHrmTimelog.ICreate>,
      },
    );
    typia.assert(timelog);
    timelogIds.push(timelog.id);
    timelogDurations.push(timelog.duration);
  }
  // 4. Create a draft timesheet for the work week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
      } satisfies DeepPartial<IErpHrmTimesheet.ICreate>,
    },
  );
  typia.assert(timesheet);
  // 5. Update the timesheet with timelog associations
  const updatedTimesheet = await api.functional.erpHrm.member.timesheets.update(
    memberConnection,
    {
      timesheetId: timesheet.id,
      body: {
        timelog_ids: timelogIds,
      } satisfies IErpHrmTimesheet.IUpdate,
    },
  );
  typia.assert(updatedTimesheet);
  // 6. Validate the updated timesheet
  TestValidator.equals(
    "timesheet status is draft",
    updatedTimesheet.status,
    "draft",
  );
  // 7. Validate total_hours calculation
  const expectedTotalHours =
    timelogDurations.reduce((sum, d) => sum + d, 0) / 60;
  TestValidator.equals(
    "total_hours correctly calculated",
    updatedTimesheet.total_hours,
    expectedTotalHours,
  );
  // 8. Validate all timelogs are associated
  TestValidator.equals(
    "all timelogs associated",
    updatedTimesheet.timelogs.length,
    3,
  );
  const associatedTimelogIds = updatedTimesheet.timelogs.map((t) => t.id);
  for (const timelogId of timelogIds) {
    TestValidator.predicate(
      `timelog ${timelogId} is associated`,
      associatedTimelogIds.includes(timelogId),
    );
  }
  // 9. Validate timelog details include project context
  for (const timelog of updatedTimesheet.timelogs) {
    TestValidator.predicate("timelog has project", timelog.project !== null);
    TestValidator.equals("project id matches", timelog.project.id, project.id);
  }
}
