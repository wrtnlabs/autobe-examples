import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_timelog_list_basic_happy_path(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Project Alpha",
          color_code: "#FF5733",
          description: "Test project for timelog listing",
        },
      },
    );
  typia.assert(project);
  // 4. Add the owner's employee as a project member
  // The prepare function inside the generator should resolve
  // the current user's employee_id from the connection context
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        body: {
          role: "member" as const,
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 5. Create 3 timelogs with different dates, durations, descriptions
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Timelog 1: today, 60 min
  const timelog1Date = new Date(today);
  const timelog1 =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: timelog1Date.toISOString(),
          duration_minutes: typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(60),
          project_id: project.id,
          description: "Worked on feature implementation",
          billable: true,
        },
      },
    );
  typia.assert(timelog1);
  // Timelog 2: yesterday, 90 min
  const timelog2Date = new Date(today);
  timelog2Date.setDate(timelog2Date.getDate() - 1);
  const timelog2 =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: timelog2Date.toISOString(),
          duration_minutes: typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(90),
          project_id: project.id,
          description: "Code review session",
          billable: true,
        },
      },
    );
  typia.assert(timelog2);
  // Timelog 3: 2 days ago, 120 min
  const timelog3Date = new Date(today);
  timelog3Date.setDate(timelog3Date.getDate() - 2);
  const timelog3 =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: timelog3Date.toISOString(),
          duration_minutes: typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(120),
          project_id: project.id,
          description: "Sprint planning meeting",
          billable: true,
        },
      },
    );
  typia.assert(timelog3);
  // ---- Test: List timelogs ----
  const page = await api.functional.hrmTimeTracking.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmTimeTrackingTimelog.IRequest,
    },
  );
  typia.assert(page);
  typia.assertGuard<IPageIHrmTimeTrackingTimelog.ISummary>(page);
  // Validate pagination
  TestValidator.equals("pagination.current", page.pagination.current, 1);
  TestValidator.predicate(
    "pagination.limit matches default",
    page.pagination.limit > 0,
  );
  TestValidator.equals("pagination.records", page.pagination.records, 3);
  TestValidator.predicate("pagination.pages >= 1", page.pagination.pages >= 1);
  // Validate data array
  TestValidator.equals("data length", page.data.length, 3);
  // Validate each timelog in the response
  const timelogInputs = [
    {
      id: timelog1.id,
      date: timelog1Date.toISOString(),
      duration_minutes: 60,
      description: "Worked on feature implementation",
    },
    {
      id: timelog2.id,
      date: timelog2Date.toISOString(),
      duration_minutes: 90,
      description: "Code review session",
    },
    {
      id: timelog3.id,
      date: timelog3Date.toISOString(),
      duration_minutes: 120,
      description: "Sprint planning meeting",
    },
  ];
  for (const input of timelogInputs) {
    const summary = page.data.find((d) => d.id === input.id);
    TestValidator.predicate(
      `timelog ${input.id} exists in results`,
      summary !== null && summary !== undefined,
    );
    if (summary !== null && summary !== undefined) {
      // Validate employee
      TestValidator.predicate(
        `timelog ${input.id} has employee id`,
        typeof summary.employee.id === "string" &&
          summary.employee.id.length > 0,
      );
      TestValidator.predicate(
        `timelog ${input.id} has employee display_name`,
        typeof summary.employee.member.display_name === "string" &&
          summary.employee.member.display_name.length > 0,
      );
      // Validate project
      TestValidator.equals(
        `timelog ${input.id} project id`,
        summary.project.id,
        project.id,
      );
      TestValidator.equals(
        `timelog ${input.id} project name`,
        summary.project.name,
        "Project Alpha",
      );
      TestValidator.equals(
        `timelog ${input.id} project colorCode`,
        summary.project.colorCode,
        "#FF5733",
      );
      // Validate task is null/absent
      TestValidator.predicate(
        `timelog ${input.id} task is absent/null`,
        summary.task === null || summary.task === undefined,
      );
      // Validate date
      const summaryDate = new Date(summary.date).toISOString().split("T")[0];
      const inputDate = new Date(input.date).toISOString().split("T")[0];
      TestValidator.equals(`timelog ${input.id} date`, summaryDate, inputDate);
      // Validate duration
      TestValidator.equals(
        `timelog ${input.id} duration_minutes`,
        summary.duration_minutes,
        input.duration_minutes,
      );
      // Validate description
      TestValidator.equals(
        `timelog ${input.id} description`,
        summary.description,
        input.description,
      );
      // Validate billable
      TestValidator.equals(
        `timelog ${input.id} billable`,
        summary.billable,
        true,
      );
    }
  }
  // Verify sorting by date descending (most recent first)
  for (let i = 1; i < page.data.length; i++) {
    TestValidator.predicate(
      `timelog at index ${i - 1} date >= timelog at index ${i} date (descending sort)`,
      new Date(page.data[i - 1].date).getTime() >=
        new Date(page.data[i].date).getTime(),
    );
  }
  // Verify no soft-deleted timelogs appear (they should have valid IDs matching our created ones)
  TestValidator.equals(
    "all created timelogs found in results",
    page.data.length,
    3,
  );
}