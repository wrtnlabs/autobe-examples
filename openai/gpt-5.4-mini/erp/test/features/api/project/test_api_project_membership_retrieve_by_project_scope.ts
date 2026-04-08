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

export async function test_api_project_membership_retrieve_by_project_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const employee = await generate_random_erp_hrm_time_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: typia.random<string & tags.Format<"uuid">>(),
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
      } satisfies IErpHrmTimeEmployeeDashboardSummary.ICreate,
    },
  );
  typia.assert(employee);
  const membership =
    await generate_random_erp_hrm_time_member_projects_memberships_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          erpHrmtimeEmployeeId: employee.id,
          projectRole: "member",
        } satisfies IErpHrmTimeProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  const output = await api.functional.erpHrmTime.member.projects.memberships.at(
    memberConnection,
    {
      projectId: project.id,
      membershipId: membership.id,
    },
  );
  typia.assert(output);
  TestValidator.equals("membership id", output.id, membership.id);
  TestValidator.equals(
    "membership project id",
    output.erp_hrm_time_project_id,
    project.id,
  );
  TestValidator.equals(
    "membership employee id",
    output.erp_hrm_time_employee_id,
    employee.id,
  );
  TestValidator.equals(
    "membership role",
    output.project_role,
    membership.project_role,
  );
  TestValidator.equals("project summary id", output.project.id, project.id);
  TestValidator.equals(
    "project summary organization",
    output.project.organization.id,
    project.organization.id,
  );
  TestValidator.equals("employee summary id", output.employee.id, employee.id);
  TestValidator.equals(
    "employee summary organization",
    output.employee.organization.id,
    employee.organization.id,
  );
  TestValidator.predicate(
    "created timestamp exists",
    output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    output.updated_at.length > 0,
  );
  TestValidator.equals("not deleted", output.deleted_at, null);
}
