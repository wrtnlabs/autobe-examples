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
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_creation_with_all_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A with captured credentials
  const memberAConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Create organization (Member A becomes owner, auto-creates employee record)
  const org =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(org);
  // 3. Re-authenticate to get updated employee list with the auto-created employee
  const refreshedAuth = await authorize_member_login(memberAConnection, {
    body: {
      email: memberAAuth.email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(refreshedAuth);
  // 4. Extract Employee A's ID
  const employeeA = refreshedAuth.employees[0];
  typia.assert(employeeA);
  TestValidator.predicate(
    "has at least one employee",
    refreshedAuth.employees.length >= 1,
  );
  const employeeId = employeeA.id;
  // 5. Create a project within the organization
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberAConnection,
      {},
    );
  typia.assert(project);
  const projectId = project.id;
  // 6. Add Employee A as project-lead member of the project
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberAConnection,
      {
        body: {
          employee_id: employeeId,
          role: "project-lead",
        },
        params: { projectId },
      },
    );
  typia.assert(projectMember);
  // 7. Create a task with all optional fields populated
  const dueDate = "2026-05-15T23:59:59Z";
  const task =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberAConnection,
      {
        body: {
          title: "Refactor database access layer",
          description: "Improve query performance and add connection pooling",
          priority: "high",
          estimated_hours: 24,
          due_date: dueDate,
          employee_id: employeeId,
        },
        params: { projectId },
      },
    );
  typia.assert(task);
  // 8. Validate task response
  // 8.1. Direct value matches
  TestValidator.equals("title", task.title, "Refactor database access layer");
  TestValidator.equals(
    "description",
    task.description,
    "Improve query performance and add connection pooling",
  );
  TestValidator.equals("status", task.status, "open");
  TestValidator.equals("priority", task.priority, "high");
  TestValidator.equals("estimatedHours", task.estimatedHours, 24);
  TestValidator.equals("dueDate", task.dueDate, dueDate);
  // 8.2. Assigned employee validation
  TestValidator.equals(
    "assigned employee id",
    task.assignedEmployee!.id,
    employeeId,
  );
  // 8.3. Structural validations (basic ones - typia.assert covers type correctness)
  TestValidator.equals("parent is null", task.parent, null);
  TestValidator.equals("subtasks is empty array", task.subtasks.length, 0);
  // 8.4. Task history validation
  TestValidator.equals(
    "taskHistories has one entry",
    task.taskHistories.length,
    1,
  );
  TestValidator.equals(
    "first history new_status",
    task.taskHistories[0].new_status,
    "open",
  );
  // 8.5. Project reference validation
  TestValidator.equals("project id matches", task.project.id, projectId);
}
