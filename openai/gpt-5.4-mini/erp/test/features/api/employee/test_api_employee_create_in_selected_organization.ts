import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_member_departments_create";
import { generate_random_erp_hrm_time_member_employees_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_create";
import { generate_random_erp_hrm_time_member_organization_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_organization_memberships_create";
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";
import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../../../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";
import { prepare_random_erp_hrm_time_organization_membership } from "../../../prepare/prepare_random_erp_hrm_time_organization_membership";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";

export async function test_api_employee_create_in_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const contextConnection: api.IConnection = { host: connection.host };
  contextConnection.headers = {
    Authorization: `Bearer ${member.token.access}`,
  };
  const role = await generate_random_erp_hrm_time_member_roles_create(
    contextConnection,
    {
      body: {
        name: `${RandomGenerator.alphabets(8)}-role`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: "employee:manage",
            description: "Manage employees",
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      },
    },
  );
  typia.assert(role);
  const department =
    await generate_random_erp_hrm_time_member_departments_create(
      contextConnection,
      {
        body: {
          name: `${RandomGenerator.alphabets(8)}-department`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(department);
  const employmentType = RandomGenerator.pick([
    "full-time",
    "part-time",
    "contractor",
    "intern",
  ] as const);
  const positionTitle = RandomGenerator.name();
  const employee = await generate_random_erp_hrm_time_member_employees_create(
    contextConnection,
    {
      body: {
        member_id: member.id,
        role_id: role.id,
        department_id: department.id,
        position_title: positionTitle,
        employment_type: employmentType,
      } satisfies IErpHrmTimeEmployeeDashboardSummary.ICreate,
    },
  );
  typia.assert(employee);
  TestValidator.equals(
    "employee organization",
    employee.erpHrmTimeOrganizationId,
    role.organization.id,
  );
  TestValidator.equals(
    "employee member",
    employee.erpHrmTimeMemberId,
    member.id,
  );
  TestValidator.equals("employee role", employee.erpHrmTimeRoleId, role.id);
  TestValidator.equals(
    "employee department",
    employee.erpHrmTimeDepartmentId,
    department.id,
  );
  TestValidator.equals(
    "employee position title",
    employee.positionTitle,
    positionTitle,
  );
  TestValidator.equals(
    "employee employment type",
    employee.employmentType,
    employmentType,
  );
  TestValidator.predicate(
    "employee has organization context",
    employee.organization.id === role.organization.id,
  );
  TestValidator.predicate(
    "employee role belongs to organization",
    employee.role.organization.id === employee.organization.id,
  );
  TestValidator.predicate(
    "employee department belongs to organization",
    employee.department !== null &&
      employee.department.organization.id === employee.organization.id,
  );
}
