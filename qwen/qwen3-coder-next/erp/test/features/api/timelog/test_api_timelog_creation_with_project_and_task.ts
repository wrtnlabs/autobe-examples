import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import type { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { generate_random_hrm_tracker_member_projects_tasks_create } from "../../../generate/generate_random_hrm_tracker_member_projects_tasks_create";
import { generate_random_hrm_tracker_member_timelogs_create } from "../../../generate/generate_random_hrm_tracker_member_timelogs_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";
import { prepare_random_hrm_tracker_task } from "../../../prepare/prepare_random_hrm_tracker_task";
import { prepare_random_hrm_tracker_timelog } from "../../../prepare/prepare_random_hrm_tracker_timelog";

export async function test_api_timelog_creation_with_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the system
  const member = await api.functional.hrmTracker.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await api.functional.hrmTracker.member.organizations.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmTrackerOrganization.ICreate,
    });
  typia.assert(organization);
  // 3. Create employee record
  const employee = await api.functional.hrmTracker.member.employees.create(
    connection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: "Developer",
        department_id: null,
        role_id: null,
        organization_id: organization.id,
        user_id: member.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project = await api.functional.hrmTracker.member.projects.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(3),
        color: "#FF5733",
        description: RandomGenerator.content({ paragraphs: 1 }),
        budget_hours: 100,
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Assign employee to project
  const projectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      connection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: employee.id,
          role: "member",
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 6. Create optional task
  const task = await api.functional.hrmTracker.member.projects.tasks.create(
    connection,
    {
      projectId: project.id,
      body: {
        title: RandomGenerator.name(2),
        status: "open",
        priority: "medium",
        assigned_employee_id: employee.id,
      } satisfies IHrmTrackerTask.ICreate,
    },
  );
  typia.assert(task);
  // 7. Create timelog with valid date (today or past)
  const timelog = await api.functional.hrmTracker.member.timelogs.create(
    connection,
    {
      body: {
        date: new Date().toISOString(),
        duration_in_minutes: 60,
        project_id: project.id,
        task_id: task.id,
        description: "Working on project tasks",
        billable: true,
      } satisfies IHrmTrackerTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 8. Validate timelog includes all fields and references
  TestValidator.equals(
    "organization matches",
    timelog.organization.id,
    organization.id,
  );
  TestValidator.equals("employee matches", timelog.employee.id, employee.id);
  TestValidator.equals("project matches", timelog.project.id, project.id);
  TestValidator.equals("task matches", timelog.task?.id, task.id);
  TestValidator.predicate(
    "date is today or past",
    new Date(timelog.date) <= new Date(),
  );
  TestValidator.predicate(
    "duration is positive",
    timelog.duration_in_minutes > 0,
  );
  TestValidator.equals(
    "description matches",
    timelog.description,
    "Working on project tasks",
  );
  TestValidator.equals("billable matches", timelog.billable, true);
}
