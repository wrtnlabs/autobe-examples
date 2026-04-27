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

/**
 * Test that a project-lead can update non-status attributes of a task.
 *
 * Validates that a project-lead (the organization owner added to a project with
 * the 'project-lead' role) can modify title, description, priority, estimated
 * hours, and due date of a task without changing its status. Verifies that the
 * status remains 'open' and no TaskHistory entry is created since the status
 * did not change.
 *
 * 1. Register a new member account.
 * 2. Create an organization (auto-creates an employee record for the owner).
 * 3. Create a project within the organization.
 * 4. Refresh session to get the updated employees list including the
 *    auto-created employee record.
 * 5. Add the authenticated member's employee record to the project as
 *    'project-lead'.
 * 6. Create a task with just a title (status defaults to 'open').
 * 7. Update the task with new title, description, priority 'high', estimated
 *    hours 8.0, and a future due date — without including status.
 * 8. Verify updated fields and that status remains 'open', and confirm no new
 *    TaskHistory entry was created.
 */
export async function test_api_task_update_attributes_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization (auto-creates employee record for the owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project within the organization
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 4. Refresh session to get updated employees list including the auto-created record
  const refreshed = await authorize_member_refresh(memberConnection, {
    body: {
      refresh: authorized.token.refresh,
    },
  });
  typia.assert(refreshed);
  const employee = refreshed.employees[0];
  typia.assertGuard(employee!);
  // 5. Add owner's employee to project as project-lead
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        body: {
          employee_id: employee.id,
          role: "project-lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create a task with just a title (status defaults to 'open')
  const task =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  const originalHistoryCount = task.taskHistories.length;
  // 7. Update the task with new attributes — no status change
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription = RandomGenerator.content({ paragraphs: 2 });
  const futureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedTask =
    await api.functional.hrmTimeTracking.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          title: newTitle,
          description: newDescription,
          priority: "high",
          estimatedHours: 8.0,
          dueDate: futureDate,
        } satisfies IHrmTimeTrackingTask.IUpdate,
      },
    );
  typia.assert(updatedTask);
  // 8. Verify updated field values
  TestValidator.equals("title", updatedTask.title, newTitle);
  TestValidator.equals("description", updatedTask.description, newDescription);
  TestValidator.equals("priority", updatedTask.priority, "high");
  TestValidator.equals("estimatedHours", updatedTask.estimatedHours, 8.0);
  TestValidator.equals("dueDate", updatedTask.dueDate, futureDate);
  // 9. Verify unchanged fields
  TestValidator.equals("status unchanged", updatedTask.status, "open");
  TestValidator.equals("id unchanged", updatedTask.id, task.id);
  TestValidator.equals(
    "project unchanged",
    updatedTask.project.id,
    task.project.id,
  );
  TestValidator.equals(
    "assignedEmployee null",
    updatedTask.assignedEmployee,
    null,
  );
  TestValidator.predicate(
    "updatedAt > createdAt",
    new Date(updatedTask.updatedAt).getTime() >
      new Date(updatedTask.createdAt).getTime(),
  );
  // 10. Verify no new task history entry was created (status didn't change)
  TestValidator.equals(
    "no new task history entries",
    updatedTask.taskHistories.length,
    originalHistoryCount,
  );
}
