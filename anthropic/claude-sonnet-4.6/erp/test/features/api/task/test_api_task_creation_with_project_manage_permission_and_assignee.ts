import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_creation_with_project_manage_permission_and_assignee(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register owner (first member) ──
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // ── Step 2: Create organization (owner auto-assigned with all built-in permissions) ──
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // ── Step 3: Create a custom role with minimal permissions for the second member ──
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          permissions: ["employee:view"],
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(customRole);
  // ── Step 4: Register the second member (task assignee) ──
  const assigneeConnection: api.IConnection = { host: connection.host };
  const assigneeAuth = await authorize_member_join(assigneeConnection, {});
  // ── Step 5: Add second member to the organization ──
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: assigneeAuth.id,
          roleId: customRole.id,
          employmentType: "full-time",
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(orgMember);
  // ── Step 6: Create a project ──
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // ── Step 7: Assign the second member to the project ──
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          organizationMemberId: orgMember.id,
          projectRole: "member",
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // ── Task Creation: Create task as owner with full payload ──
  const futureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const taskTitle = "Implement login feature";
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    ownerConnection,
    {
      body: {
        title: taskTitle,
        status: "in-progress",
        priority: "high",
        description: "Implement the login feature for the application.",
        estimated_hours: 8.0,
        due_date: futureDate,
        assignee_id: orgMember.id,
      },
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // ── Verify task properties ──
  TestValidator.equals("task title matches", task.title, taskTitle);
  TestValidator.equals(
    "task status is in-progress",
    task.status,
    "in-progress",
  );
  TestValidator.equals("task priority is high", task.priority, "high");
  TestValidator.equals("task estimatedHours is 8.0", task.estimatedHours, 8.0);
  TestValidator.predicate("task dueDate is set", task.dueDate !== null);
  TestValidator.predicate("task assignee is not null", task.assignee !== null);
  TestValidator.equals(
    "task assignee id matches",
    task.assignee!.id,
    orgMember.id,
  );
  TestValidator.equals("task project id matches", task.project.id, project.id);
  TestValidator.predicate("task parent is null", task.parent === null);
  TestValidator.predicate(
    "task subtasks is empty array",
    task.subtasks.length === 0,
  );
  TestValidator.predicate(
    "task taskHistories has at least one entry",
    task.taskHistories.length >= 1,
  );
  TestValidator.predicate("task deletedAt is null", task.deletedAt === null);
  // ── Additional Validation: Assignee must be a project member ──
  // Register a third member and add to the organization but NOT to the project
  const nonProjectMemberConnection: api.IConnection = { host: connection.host };
  const nonProjectMemberAuth = await authorize_member_join(
    nonProjectMemberConnection,
    {},
  );
  const nonProjectOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: nonProjectMemberAuth.id,
          roleId: customRole.id,
          employmentType: "full-time",
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(nonProjectOrgMember);
  // Attempt to create a task with the non-project-member as assignee — should fail with 422
  await TestValidator.error("assignee must be a project member", async () => {
    await generate_random_erp_hrm_member_projects_tasks_create(
      ownerConnection,
      {
        body: {
          title: "Task with invalid assignee",
          status: "open",
          priority: "medium",
          assignee_id: nonProjectOrgMember.id,
        },
        params: { projectId: project.id },
      },
    );
  });
}
