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

export async function test_api_task_history_access_denied_for_non_project_member(
  connection: api.IConnection,
): Promise<void> {
  // ─── Step 1: Register Member A (organization owner) ───────────────────────
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // ─── Step 2: Member A creates the organization ─────────────────────────────
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // ─── Step 3: Member A creates a restricted role (no project:manage) ────────
  const restrictedRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberAConnection,
      {
        body: {
          name: "restricted-role-" + RandomGenerator.alphabets(6),
          permissions: ["employee:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(restrictedRole);
  // ─── Step 4: Register Member B ─────────────────────────────────────────────
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: { email: memberBEmail },
  });
  typia.assert(memberBAuth);
  // ─── Step 5: Member A adds Member B to the organization with restricted role ─
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      memberAConnection,
      {
        body: {
          memberId: memberBAuth.member.id,
          roleId: restrictedRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMember);
  // ─── Step 6: Member A creates a project (Member B is NOT added) ────────────
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // ─── Step 7: Member A creates a task in the project ────────────────────────
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberAConnection,
    {
      body: {
        title: "Test Task " + RandomGenerator.alphabets(6),
      },
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // The task creation auto-generates a history entry. Get the first history ID.
  TestValidator.predicate(
    "task has at least one history entry",
    task.taskHistories.length > 0,
  );
  const historyId = task.taskHistories[0]!.id;
  // ─── Step 8: Member A can access the task history (baseline / positive case) ─
  const historyByMemberA =
    await api.functional.erpHrm.member.projects.tasks.histories.at(
      memberAConnection,
      {
        projectId: project.id,
        taskId: task.id,
        historyId: historyId,
      },
    );
  typia.assert(historyByMemberA);
  // ─── Step 9: Member B (non-project-member) is DENIED access ────────────────
  await TestValidator.httpError(
    "non-project-member should be denied task history access",
    [403, 404],
    async () => {
      await api.functional.erpHrm.member.projects.tasks.histories.at(
        memberBConnection,
        {
          projectId: project.id,
          taskId: task.id,
          historyId: historyId,
        },
      );
    },
  );
}
