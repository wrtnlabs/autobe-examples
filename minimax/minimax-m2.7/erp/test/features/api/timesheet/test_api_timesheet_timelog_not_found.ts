import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that retrieving a timesheet-timelog association with non-existent
 * timesheetTimelogId returns 404 Not Found.
 *
 * Steps:
 * 1. Admin joins with time:view_all permission
 * 2. Member creates project, task, timelog, and timesheet
 * 3. Associate timelog with timesheet to create valid junction record
 * 4. Admin attempts to retrieve with invalid timesheetTimelogId
 * 5. Validate response returns 404 Not Found error
 * 6. Also test with valid timesheetTimelogId but belonging to different timesheet
 */
export async function test_api_timesheet_timelog_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins with time:view_all permission
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Member creates project, task, timelog, and timesheet
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: new Date().toISOString(),
        durationMinutes: 60,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        week_end_date: new Date().toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 3. Associate timelog with timesheet to create valid junction record
  const associatedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.add(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          erp_hrm_timelog_id: timelog.id,
        },
      },
    );
  typia.assert(associatedTimesheet);
  // Get the valid junction record ID from the associated timesheet
  const validJunctionId = associatedTimesheet.timesheetTimelogs[0]?.id;
  TestValidator.predicate(
    "junction record created",
    validJunctionId !== undefined,
  );
  // 4. Admin attempts to retrieve with non-existent timesheetTimelogId
  // 5. Validate response returns 404 Not Found error
  const nonExistentTimelogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent timesheetTimelogId returns 404",
    async () => {
      await api.functional.erpHrm.admin.timesheets.timelogs.at(
        adminConnection,
        {
          timesheetId: timesheet.id,
          timesheetTimelogId: nonExistentTimelogId,
        },
      );
    },
  );
  // 6. Also test with valid timesheetTimelogId but belonging to different timesheet
  // Create another member with their own timesheet to get a different junction ID
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const project2 = await generate_random_erp_hrm_member_projects_create(
    member2Connection,
    {},
  );
  typia.assert(project2);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    member2Connection,
    {
      body: {
        projectId: project2.id,
        date: new Date().toISOString(),
        durationMinutes: 30,
      },
    },
  );
  typia.assert(timelog2);
  const timesheet2 = await generate_random_erp_hrm_member_timesheets_create(
    member2Connection,
    {
      body: {
        week_start_date: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        week_end_date: new Date().toISOString(),
      },
    },
  );
  typia.assert(timesheet2);
  const associatedTimesheet2 =
    await api.functional.erpHrm.member.timesheets.timelogs.add(
      member2Connection,
      {
        timesheetId: timesheet2.id,
        body: {
          erp_hrm_timelog_id: timelog2.id,
        },
      },
    );
  typia.assert(associatedTimesheet2);
  // Try to retrieve junction from timesheet2 using junction ID from timesheet1
  // This should return 404 because the junction record doesn't belong to timesheet2
  await TestValidator.error(
    "junction ID from different timesheet returns 404",
    async () => {
      await api.functional.erpHrm.admin.timesheets.timelogs.at(
        adminConnection,
        {
          timesheetId: timesheet2.id,
          timesheetTimelogId: validJunctionId!,
        },
      );
    },
  );
}
