import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_memberships_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_project_membership";

export async function test_api_project_membership_update_permission_and_role_change(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  const ownerEmail = `${RandomGenerator.alphabets(8)}_${RandomGenerator.alphabets(6)}@example.com`;
  const memberEmail = `${RandomGenerator.alphabets(8)}_${RandomGenerator.alphabets(6)}@example.com`;
  const password = "Password123!";
  const ownerJoined = await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerJoined);
  const memberJoined = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberJoined);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    ownerConnection,
    {
      body: {
        name: `Project ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366FF",
        status: "active",
        budgetHours: 100,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const membership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          erpHrmtimeEmployeeId: memberJoined.id,
          projectRole: "member",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  const updated =
    await api.functional.erpHrmTime.member.projects.memberships.update(
      ownerConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
        body: {
          project_role: "project-lead",
        } satisfies IErpHrmTimeProjectMembership.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "membership id should stay the same",
    updated.id,
    membership.id,
  );
  TestValidator.equals(
    "project id should stay the same",
    updated.erp_hrm_time_project_id,
    project.id,
  );
  TestValidator.equals(
    "employee id should stay the same",
    updated.erp_hrm_time_employee_id,
    memberJoined.id,
  );
  TestValidator.equals(
    "project role should change to project-lead",
    updated.project_role,
    "project-lead",
  );
  TestValidator.equals(
    "project relation should remain local to the same project",
    updated.project.id,
    project.id,
  );
  TestValidator.equals(
    "employee relation should remain the same",
    updated.employee.id,
    memberJoined.id,
  );
  const reverted =
    await api.functional.erpHrmTime.member.projects.memberships.update(
      ownerConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
        body: {
          project_role: "member",
        } satisfies IErpHrmTimeProjectMembership.IUpdate,
      },
    );
  typia.assert(reverted);
  TestValidator.equals(
    "role should revert to member",
    reverted.project_role,
    "member",
  );
  TestValidator.equals(
    "project should remain unchanged after revert",
    reverted.erp_hrm_time_project_id,
    project.id,
  );
  TestValidator.equals(
    "employee should remain unchanged after revert",
    reverted.erp_hrm_time_employee_id,
    memberJoined.id,
  );
}
