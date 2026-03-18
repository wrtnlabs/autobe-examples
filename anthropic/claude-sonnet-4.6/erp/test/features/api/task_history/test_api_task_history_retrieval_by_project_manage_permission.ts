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

export async function test_api_task_history_retrieval_by_project_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================
  // Step 1: Register Member A (will become organization owner with project:manage)
  // =========================================================
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // =========================================================
  // Step 2: Member A creates an organization
  // (Member A becomes Owner with project:manage automatically)
  // =========================================================
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      { body: {} },
    );
  typia.assert(organization);
  // =========================================================
  // Step 3: Register Member B (regular project employee)
  // =========================================================
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuthorized);
  // =========================================================
  // Step 4: Member A creates a custom role for Member B
  // with project:view but NOT project:manage
  // =========================================================
  const memberBRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberAConnection,
      {
        body: {
          name: `employee-role-${RandomGenerator.alphaNumeric(6)}`,
          permissions: ["project:view", "employee:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(memberBRole);
  // =========================================================
  // Step 5: Member A adds Member B to the organization
  // with the non-manager role
  // =========================================================
  const orgMemberB =
    await generate_random_erp_hrm_member_organizations_members_create(
      memberAConnection,
      {
        body: {
          memberId: memberBAuthorized.member.id,
          roleId: memberBRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMemberB);
  // =========================================================
  // Step 6: Member A creates a project
  // (Member A will NOT be a direct project member — key test condition)
  // =========================================================
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    { body: {} },
  );
  typia.assert(project);
  // =========================================================
  // Step 7: Member A assigns Member B to the project as a regular member
  // (Member A is NOT assigned — this is the core test condition)
  // =========================================================
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberAConnection,
      {
        body: {
          organizationMemberId: orgMemberB.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // =========================================================
  // Step 8: Member A creates a task in the project
  // (Member A uses project:manage org permission to create tasks)
  // Task creation auto-generates the initial task history entry
  // =========================================================
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberAConnection,
    {
      body: {
        title: `Test Task ${RandomGenerator.alphaNumeric(8)}`,
        status: "open",
        priority: "medium",
      },
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // =========================================================
  // Step 9: Extract the historyId from the task's taskHistories array
  // The initial creation generates at least one history entry
  // =========================================================
  TestValidator.predicate(
    "task should have at least one history entry",
    task.taskHistories.length > 0,
  );
  const firstHistory = task.taskHistories[0]!;
  // =========================================================
  // Test Execution: Member A retrieves task history
  // Member A has project:manage but is NOT a direct project member
  // This validates the permission-based bypass path
  // =========================================================
  const history =
    await api.functional.erpHrm.member.projects.tasks.histories.at(
      memberAConnection,
      {
        projectId: project.id,
        taskId: task.id,
        historyId: firstHistory.id,
      },
    );
  typia.assert(history);
  // =========================================================
  // Business Logic Validations
  // =========================================================
  // Verify the returned history entry is the one we requested
  TestValidator.equals(
    "history id matches requested historyId",
    history.id,
    firstHistory.id,
  );
  // Verify the task reference in the history entry is correct
  TestValidator.equals(
    "history task id matches created task",
    history.task.id,
    task.id,
  );
}
