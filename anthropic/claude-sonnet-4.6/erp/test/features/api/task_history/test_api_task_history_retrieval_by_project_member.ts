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

export async function test_api_task_history_retrieval_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register Member A (organization owner / project manager) ──
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // ── Step 2: Member A creates an organization ──
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // ── Step 3: Member A creates a custom role with project:manage and employee:manage ──
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberAConnection,
      {
        body: {
          name: `role-${RandomGenerator.alphaNumeric(8)}`,
          permissions: ["project:manage", "employee:manage", "project:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // ── Step 4: Register Member B (the project employee) ──
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  // ── Step 5: Member A adds Member B to the organization with the custom role ──
  const orgMemberB =
    await generate_random_erp_hrm_member_organizations_members_create(
      memberAConnection,
      {
        body: {
          memberId: memberBAuthorized.id,
          roleId: customRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMemberB);
  // ── Step 6: Member A creates a project within the organization ──
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // ── Step 7: Member A assigns Member B to the project as project-lead ──
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberAConnection,
      {
        body: {
          organizationMemberId: orgMemberB.id,
          projectRole: "project-lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // ── Step 8: Member A creates a task within the project ──
  const taskTitle = `Task-${RandomGenerator.alphaNumeric(8)}`;
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberAConnection,
    {
      body: {
        title: taskTitle,
        status: "open",
        priority: "medium",
      },
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // The task creation auto-generates an initial history entry
  TestValidator.predicate(
    "task has at least one history entry",
    task.taskHistories.length > 0,
  );
  const initialHistory = task.taskHistories[0]!;
  const historyId = initialHistory.id;
  // ── Test Execution: Member B retrieves the task history entry ──
  const history =
    await api.functional.erpHrm.member.projects.tasks.histories.at(
      memberBConnection,
      {
        projectId: project.id,
        taskId: task.id,
        historyId: historyId,
      },
    );
  typia.assert(history);
  // ── Validations ──
  TestValidator.equals(
    "history id matches requested historyId",
    history.id,
    historyId,
  );
  TestValidator.equals(
    "history task id matches the created task",
    history.task.id,
    task.id,
  );
  TestValidator.equals(
    "history task title matches",
    history.task.title,
    taskTitle,
  );
  TestValidator.predicate("recorder is present", history.recorder !== null);
  TestValidator.predicate(
    "oldStatus is non-empty",
    history.oldStatus.length > 0,
  );
  TestValidator.predicate(
    "newStatus is non-empty",
    history.newStatus.length > 0,
  );
  TestValidator.predicate("createdAt is present", history.createdAt.length > 0);
  // ── Edge Case: Mismatched taskId should return 404 ──
  const wrongTaskId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("mismatched taskId returns error", async () => {
    await api.functional.erpHrm.member.projects.tasks.histories.at(
      memberBConnection,
      {
        projectId: project.id,
        taskId: wrongTaskId,
        historyId: historyId,
      },
    );
  });
}
