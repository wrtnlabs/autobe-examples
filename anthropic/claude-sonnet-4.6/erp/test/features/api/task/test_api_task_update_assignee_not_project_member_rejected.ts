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

export async function test_api_task_update_assignee_not_project_member_rejected(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register member1 and create organization ──────────────────────
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member1Auth);
  // member1 creates the organization — becomes owner with project:manage
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      member1Connection,
      { body: {} },
    );
  typia.assert(organization);
  // ── Step 2: Create a custom role for member2 in the organization ──────────
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      member1Connection,
      {
        params: { organizationId: organization.id },
        body: {
          name: `role_${RandomGenerator.alphaNumeric(8)}`,
          permissions: ["project:view", "time:view_all"],
        },
      },
    );
  typia.assert(customRole);
  // ── Step 3: Register member2 ───────────────────────────────────────────────
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member2Auth);
  // ── Step 4: Add member2 to the organization (but NOT to the project) ──────
  const member2OrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      member1Connection,
      {
        params: { organizationId: organization.id },
        body: {
          memberId: member2Auth.id,
          roleId: customRole.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(member2OrgMember);
  // ── Step 5: Create project (member2 intentionally NOT added to project) ───
  const project = await generate_random_erp_hrm_member_projects_create(
    member1Connection,
    { body: {} },
  );
  typia.assert(project);
  // ── Step 6: Create a task in the project ──────────────────────────────────
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    member1Connection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // ── Step 7: Attempt to update task with member2 as assignee (422 expected) ─
  // member2 is a valid org member but NOT a project member → must be rejected
  await TestValidator.httpError(
    "assignee must be a project member",
    422,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.update(
        member1Connection,
        {
          projectId: project.id,
          taskId: task.id,
          body: {
            assignee_id: member2OrgMember.id,
          } satisfies IErpHrmTask.IUpdate,
        },
      );
    },
  );
}
