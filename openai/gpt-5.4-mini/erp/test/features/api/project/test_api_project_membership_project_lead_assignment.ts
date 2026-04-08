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
import { generate_random_erp_hrm_time_member_employees_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_create";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_memberships_create";
import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../../../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_project_membership";

export async function test_api_project_membership_project_lead_assignment(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoined = await authorize_member_join(ownerConnection, {
    body: {
      email: `owner-${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: `P@ss-${RandomGenerator.alphabets(8)}-1234!` satisfies string &
        tags.Format<"password">,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerJoined);
  ownerConnection.headers = {
    ...(ownerConnection.headers ?? {}),
    Authorization: `Bearer ${ownerJoined.token.access}`,
  };
  const project = await generate_random_erp_hrm_time_member_projects_create(
    ownerConnection,
    {
      body: {
        name: `Project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 120,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const employeeJoined = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email:
          `employee-${RandomGenerator.alphabets(8)}@test.com` satisfies string &
            tags.Format<"email">,
        password:
          `P@ss-${RandomGenerator.alphabets(8)}-1234!` satisfies string &
            tags.Format<"password">,
        displayName: RandomGenerator.name(),
        avatarImageUrl: null,
        phoneNumber: null,
        href: "https://example.com/onboarding",
        referrer: "https://example.com/referrer",
        ip: "127.0.0.1",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(employeeJoined);
  const employee = await generate_random_erp_hrm_time_member_employees_create(
    ownerConnection,
    {
      body: {
        member_id: employeeJoined.id,
        role_id: ownerJoined.id,
        department_id: null,
        position_title: RandomGenerator.name(),
        employment_type: "full-time",
      } satisfies IErpHrmTimeEmployeeDashboardSummary.ICreate,
    },
  );
  typia.assert(employee);
  const membership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          erpHrmtimeEmployeeId: employee.id,
          projectRole: "project-lead",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "membership project id",
    membership.erp_hrm_time_project_id,
    project.id,
  );
  TestValidator.equals(
    "membership employee id",
    membership.erp_hrm_time_employee_id,
    employee.id,
  );
  TestValidator.equals(
    "membership role",
    membership.project_role,
    "project-lead",
  );
  TestValidator.equals(
    "membership project relation",
    membership.project.id,
    project.id,
  );
  TestValidator.equals(
    "membership employee relation",
    membership.employee.id,
    employee.id,
  );
  await TestValidator.httpError(
    "duplicate project membership should be rejected",
    [400, 409],
    async () => {
      await generate_random_erp_hrm_time_member_projects_memberships_create(
        ownerConnection,
        {
          params: { projectId: project.id },
          body: {
            erpHrmtimeEmployeeId: employee.id,
            projectRole: "member",
          } satisfies IErpHrmTimeProjectMembership.ICreate,
        },
      );
    },
  );
}
