import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_detail_access_via_project_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register first member (owner) ──────────────────────────────
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // ── Step 2: Create organization (owner becomes Owner with built-in project:manage) ──
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // ── Step 3: Register second member (will receive project:manage but NOT be a project member) ──
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondConnection, {
    body: {
      email: secondMemberEmail,
    },
  });
  typia.assert(secondMemberAuth);
  // ── Step 4: Create custom role with project:manage permission ──────────
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: `project-manage-role-${RandomGenerator.alphabets(6)}`,
          permissions: ["project:manage"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // ── Step 5: Add second member to organization with the custom role ─────
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: secondMemberAuth.id,
          roleId: customRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMember);
  // ── Step 6: Create project (owner creates it; second member is deliberately NOT added) ──
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // ── Step 7: Create task inside project (owner has project:manage) ──────
  const taskTitle = `Task-${RandomGenerator.alphabets(8)}`;
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    ownerConnection,
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
  // ── Step 8: PRIMARY ASSERTION - Second member (project:manage, NOT a project member)
  //            retrieves task detail ────────────────────────────────────────────────
  const taskDetailBySecondMember =
    await api.functional.erpHrm.member.projects.tasks.at(secondConnection, {
      projectId: project.id,
      taskId: task.id,
    });
  typia.assert(taskDetailBySecondMember);
  // Verify task fields match the created task
  TestValidator.equals("task id matches", taskDetailBySecondMember.id, task.id);
  TestValidator.equals(
    "task title matches",
    taskDetailBySecondMember.title,
    task.title,
  );
  TestValidator.equals(
    "task status matches",
    taskDetailBySecondMember.status,
    task.status,
  );
  TestValidator.equals(
    "task priority matches",
    taskDetailBySecondMember.priority,
    task.priority,
  );
  // Verify project reference
  TestValidator.equals(
    "project id matches",
    taskDetailBySecondMember.project.id,
    project.id,
  );
  // Verify top-level task structure
  TestValidator.equals(
    "parent is null (top-level task)",
    taskDetailBySecondMember.parent,
    null,
  );
  TestValidator.predicate(
    "subtasks is empty array",
    taskDetailBySecondMember.subtasks.length === 0,
  );
  // ── Step 9: ADDITIONAL VERIFICATION - Owner also retrieves the task ───
  const taskDetailByOwner =
    await api.functional.erpHrm.member.projects.tasks.at(ownerConnection, {
      projectId: project.id,
      taskId: task.id,
    });
  typia.assert(taskDetailByOwner);
  // Verify owner gets the same task
  TestValidator.equals(
    "owner sees same task id",
    taskDetailByOwner.id,
    task.id,
  );
  TestValidator.equals(
    "owner sees same task title",
    taskDetailByOwner.title,
    task.title,
  );
  TestValidator.equals(
    "owner task parent is null",
    taskDetailByOwner.parent,
    null,
  );
  TestValidator.predicate(
    "owner sees empty subtasks",
    taskDetailByOwner.subtasks.length === 0,
  );
}
