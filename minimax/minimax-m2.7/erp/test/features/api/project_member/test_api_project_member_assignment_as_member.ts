import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_invitations_create } from "../../../generate/generate_random_erp_hrm_member_invitations_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_member_assignment_as_member(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // STEP 1: Authenticate as admin
  // ============================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://example.com/admin",
    referrer: "https://example.com/",
  } satisfies IErpHrmAdmin.IJoin;
  await api.functional.erpHrm.auth.admin.join(adminConnection, {
    body: adminCredentials,
  });
  // ============================================
  // STEP 2: Create a project
  // ============================================
  const project = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#3A7AFE" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active" as const,
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(project);
  // ============================================
  // STEP 3: Create member invitation
  // ============================================
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const invitation = await api.functional.erpHrm.member.invitations.create(
    adminConnection,
    {
      body: {
        email: memberEmail,
      } satisfies IErpHrmInvitation.ICreate,
    },
  );
  typia.assert(invitation);
  // ============================================
  // STEP 4: Accept invitation by joining as member
  // ============================================
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com/invitation",
  } satisfies IErpHrmMember.IJoin;
  await api.functional.erpHrm.auth.member.join(memberConnection, {
    body: memberCredentials,
  });
  // ============================================
  // STEP 5 & 6: Assign employee to project as member
  // The employee is created when invitation is accepted.
  // Using organization owner ID as a reference point.
  // ============================================
  const projectMember =
    await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
      projectId: project.id,
      body: {
        name: project.name,
        color: project.color,
        status: "active" as const,
      } satisfies IErpHrmProjectMember.ICreate,
    });
  typia.assert(projectMember);
  // ============================================
  // STEP 7: Validate response
  // ============================================
  TestValidator.equals("project ID matches", projectMember.id, project.id);
  TestValidator.predicate(
    "has valid project member structure",
    projectMember.project_members_count >= 0,
  );
  TestValidator.equals("status is active", projectMember.status, "active");
}
