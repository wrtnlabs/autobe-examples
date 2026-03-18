import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_retrieval_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a project for timelog association
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        colorCode: "#FF5733",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // Step 3: Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Open",
        priority: "High",
      } satisfies IErpHrmTask.ICreate,
    },
  );
  typia.assert(task);
  // Step 4: Create a timesheet for the current week
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());
  weekStartDate.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStartDate.toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // Step 5: Create timelogs associated with the project and task
  const startTime1 = new Date(weekStartDate.getTime() + 9 * 60 * 60 * 1000);
  const endTime1 = new Date(weekStartDate.getTime() + 12 * 60 * 60 * 1000);
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
        start_time: startTime1.toISOString(),
        end_time: endTime1.toISOString(),
        billable: true,
        description: "Morning development work",
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  const startTime2 = new Date(weekStartDate.getTime() + 13 * 60 * 60 * 1000);
  const endTime2 = new Date(weekStartDate.getTime() + 17 * 60 * 60 * 1000);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
        start_time: startTime2.toISOString(),
        end_time: endTime2.toISOString(),
        billable: false,
        description: "Afternoon meeting and documentation",
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // Step 6: Retrieve the timesheet with timelogs
  const retrievedTimesheet = await api.functional.erpHrm.member.timesheets.at(
    memberConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(retrievedTimesheet);
  // Step 7: Validate the response structure and data
  // Verify timesheet is in draft status
  TestValidator.equals(
    "timesheet status is draft",
    retrievedTimesheet.status,
    "draft",
  );
  // Verify timelogs array contains the created entries
  TestValidator.predicate(
    "timesheet contains timelogs",
    retrievedTimesheet.timelogs.length >= 2,
  );
  // Verify totalHours matches sum of timelog durations
  const expectedTotalHours =
    (timelog1.durationMinutes + timelog2.durationMinutes) / 60;
  TestValidator.equals(
    "totalHours matches sum of durations",
    retrievedTimesheet.totalHours,
    expectedTotalHours,
  );
  // Find the created timelogs in the response
  const foundTimelog1 = retrievedTimesheet.timelogs.find(
    (t) => t.id === timelog1.id,
  );
  const foundTimelog2 = retrievedTimesheet.timelogs.find(
    (t) => t.id === timelog2.id,
  );
  // Verify first timelog properties
  TestValidator.equals(
    "first timelog has correct duration",
    foundTimelog1?.durationMinutes,
    timelog1.durationMinutes,
  );
  TestValidator.equals(
    "first timelog is billable",
    foundTimelog1?.billable,
    true,
  );
  TestValidator.equals(
    "first timelog has correct description",
    foundTimelog1?.description,
    "Morning development work",
  );
  TestValidator.equals(
    "first timelog has correct project",
    foundTimelog1?.project.id,
    project.id,
  );
  TestValidator.equals(
    "first timelog has correct task",
    foundTimelog1?.task?.id,
    task.id,
  );
  // Verify second timelog properties
  TestValidator.equals(
    "second timelog has correct duration",
    foundTimelog2?.durationMinutes,
    timelog2.durationMinutes,
  );
  TestValidator.equals(
    "second timelog is not billable",
    foundTimelog2?.billable,
    false,
  );
  TestValidator.equals(
    "second timelog has correct description",
    foundTimelog2?.description,
    "Afternoon meeting and documentation",
  );
  TestValidator.equals(
    "second timelog has correct project",
    foundTimelog2?.project.id,
    project.id,
  );
  TestValidator.equals(
    "second timelog has correct task",
    foundTimelog2?.task?.id,
    task.id,
  );
  // Verify project summaries include color codes
  TestValidator.equals(
    "project has color code",
    foundTimelog1?.project.colorCode,
    project.color_code,
  );
  // Verify organization member is set correctly
  TestValidator.predicate(
    "timelogs have organization member",
    retrievedTimesheet.timelogs.every((t) => t.organizationMember !== null),
  );
}
