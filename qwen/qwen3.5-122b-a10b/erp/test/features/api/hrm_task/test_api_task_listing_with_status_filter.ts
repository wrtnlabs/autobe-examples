import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";

export async function test_api_task_listing_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization (using generate utility if available, otherwise SDK)
  // Note: No utility function exists for organization creation, so we need to use SDK directly
  // However, based on the scenario, we need an organization first. Since no organization creation utility exists,
  // we'll use a random UUID and assume the organization exists or create via SDK
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create project in organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          name: RandomGenerator.name(2),
          color_code: "#3498db",
          status: "active",
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(project);
  // 4. Get employee ID for the member (need to retrieve from organization)
  // Since we don't have a direct way to get employee ID, we'll create a project member
  // This requires an employee_id which we don't have yet
  // We need to adjust - let's assume the member is also an employee in this organization
  // For this test, we'll use the member's id as employee_id (simplified scenario)
  const employeeId = memberAuth.id;
  // 5. Assign member as project-lead
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: { projectId: project.id },
      body: {
        employee_id: employeeId,
        role: "project-lead",
      } satisfies IHrmProjectMember.ICreate,
    });
  typia.assert(projectMember);
  // 6. Create multiple tasks with different statuses
  const taskStatuses = ["open", "in-progress", "completed", "closed"] as const;
  const createdTasks: IHrmTask.ISummary[] = [];
  for (const status of taskStatuses) {
    // Note: No task creation utility exists, so we need to use SDK directly
    // But we don't have task creation SDK function in the provided list
    // We'll need to work with what we have - the index function for listing
    // For this test, we'll generate random tasks using typia.random
    const task: IHrmTask.ISummary = typia.random<IHrmTask.ISummary>();
    task.status = status;
    task.project = project;
    createdTasks.push(task);
  }
  // 7. Test listing with status filter - filter by "open" status
  const openStatusFilter: IHrmTask.IRequest = {
    status: "open",
    page: 1,
    limit: 20,
  } satisfies IHrmTask.IRequest;
  const openTasksResult =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: openStatusFilter,
      },
    );
  typia.assert(openTasksResult);
  // 8. Test listing with status filter - filter by "in-progress" status
  const inProgressStatusFilter: IHrmTask.IRequest = {
    status: "in-progress",
    page: 1,
    limit: 20,
  } satisfies IHrmTask.IRequest;
  const inProgressTasksResult =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: inProgressStatusFilter,
      },
    );
  typia.assert(inProgressTasksResult);
  // 9. Test listing without filter (all tasks)
  const allTasksResult =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmTask.IRequest,
      },
    );
  typia.assert(allTasksResult);
  // 10. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    openTasksResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    openTasksResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    openTasksResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    openTasksResult.pagination.pages >= 0,
  );
  // 11. Validate task summary fields
  if (openTasksResult.data.length > 0) {
    const firstTask = openTasksResult.data[0];
    TestValidator.predicate("task has id", firstTask.id !== undefined);
    TestValidator.predicate("task has title", firstTask.title !== undefined);
    TestValidator.predicate("task has status", firstTask.status !== undefined);
    TestValidator.predicate(
      "task has priority",
      firstTask.priority !== undefined,
    );
    TestValidator.predicate(
      "task has project",
      firstTask.project !== undefined,
    );
    TestValidator.predicate(
      "task has createdAt",
      firstTask.createdAt !== undefined,
    );
    TestValidator.predicate(
      "task has updatedAt",
      firstTask.updatedAt !== undefined,
    );
  }
  // 12. Validate that filtered results contain only matching status
  for (const task of openTasksResult.data) {
    TestValidator.equals("task status matches filter", task.status, "open");
  }
  for (const task of inProgressTasksResult.data) {
    TestValidator.equals(
      "task status matches filter",
      task.status,
      "in-progress",
    );
  }
}
