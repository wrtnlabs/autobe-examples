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
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_update_status_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_timezone: "UTC",
      org_fiscal_month: 1,
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization within member account
  const orgConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(orgConnection, {
    body: {
      email: memberAuth.member.email,
      password: "1234",
    },
  });
  // 3. Retrieve existing employees from organization
  const employeesResponse =
    await api.functional.hrmPlatform.member.employees.index(orgConnection, {
      body: {},
    });
  typia.assert(employeesResponse);
  const employees = employeesResponse.data;
  TestValidator.predicate(
    "employees list has at least one employee",
    employees.length >= 1,
  );
  const employee = employees[0];
  // 4. Create project within organization
  const project = await api.functional.hrmPlatform.member.projects.create(
    orgConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")}`,
      },
    },
  );
  typia.assert(project);
  // 5. Assign employee as project lead to project
  const membership =
    await api.functional.hrmPlatform.member.projects.memberships.create(
      orgConnection,
      {
        projectId: project.id,
        body: {
          employee_id: employee.id,
          role: "project_lead",
        },
      },
    );
  typia.assert(membership);
  // 6. Create task with status TODO and assign to project lead
  const taskDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const task = await api.functional.hrmPlatform.member.tasks.create(
    orgConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        project_id: project.id,
        assigned_employee_id: employee.id,
        priority: "HIGH",
        due_date: taskDueDate,
      },
    },
  );
  typia.assert(task);
  const taskWithMetadata = typia.assert<IHrmPlatformTask & { id: string; created_at: string; description: string; due_date: string; title: string; updated_at: string }>(task);
  TestValidator.equals("task initial status is TODO", taskWithMetadata.status, "TODO");
  const createdAt = new Date(taskWithMetadata.created_at);
  const taskBeforeUpdate = { ...taskWithMetadata };
  // 7. Update task status from TODO to IN_PROGRESS
  const updateDueDate = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedTask = await api.functional.hrmPlatform.member.tasks.update(
    orgConnection,
    {
      taskId: taskWithMetadata.id,
      body: {
        status: "IN_PROGRESS",
        description: "Updated description for IN_PROGRESS status",
        priority: "CRITICAL",
        due_date: updateDueDate,
      },
    },
  );
  typia.assert(updatedTask);
  const updatedTaskWithMetadata = typia.assert<IHrmPlatformTask & { id: string; created_at: string; description: string; due_date: string; title: string; updated_at: string }>(updatedTask);
  // 8. Validate the update succeeded
  TestValidator.equals(
    "task status updated to IN_PROGRESS",
    updatedTaskWithMetadata.status,
    "IN_PROGRESS",
  );
  TestValidator.equals(
    "task description updated",
    updatedTaskWithMetadata.description,
    "Updated description for IN_PROGRESS status",
  );
  TestValidator.equals(
    "task priority updated",
    updatedTaskWithMetadata.priority,
    "CRITICAL",
  );
  TestValidator.equals(
    "task due_date updated",
    updatedTaskWithMetadata.due_date,
    updateDueDate,
  );
  TestValidator.equals(
    "task title remains unchanged",
    updatedTaskWithMetadata.title,
    taskBeforeUpdate.title,
  );
  // 9. Validate updated_at timestamp is set correctly
  const updatedAt = new Date(updatedTaskWithMetadata.updated_at);
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedAt > createdAt,
  );
  // 10. Update task again with status to DONE
  const doneTask = await api.functional.hrmPlatform.member.tasks.update(
    orgConnection,
    {
      taskId: taskWithMetadata.id,
      body: {
        status: "DONE",
      },
    },
  );
  typia.assert(doneTask);
  TestValidator.equals("task status updated to DONE", doneTask.status, "DONE");
}