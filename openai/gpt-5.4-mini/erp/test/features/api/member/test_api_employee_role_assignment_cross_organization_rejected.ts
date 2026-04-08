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
import { generate_random_erp_hrm_time_member_employees_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_create";
import { generate_random_erp_hrm_time_member_role_assignment_create } from "../../../generate/generate_random_erp_hrm_time_member_role_assignment_create";
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../../../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";
import { prepare_random_erp_hrm_time_organization_membership } from "../../../prepare/prepare_random_erp_hrm_time_organization_membership";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";

export async function test_api_employee_role_assignment_cross_organization_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: `owner-${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/hrm/join",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuth);
  ownerConnection.headers = {
    ...(ownerConnection.headers ?? {}),
    Authorization: ownerAuth.token.access,
  };
  const otherConnection: api.IConnection = { host: connection.host };
  const otherAuth = await authorize_member_join(otherConnection, {
    body: {
      email: `other-${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/hrm/join",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(otherAuth);
  otherConnection.headers = {
    ...(otherConnection.headers ?? {}),
    Authorization: otherAuth.token.access,
  };
  const ownerRole = await generate_random_erp_hrm_time_member_roles_create(
    ownerConnection,
    {
      body: {
        name: `owner-role-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: "employee:manage",
            description: "manage employees",
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      },
    },
  );
  typia.assert(ownerRole);
  const targetRole = await generate_random_erp_hrm_time_member_roles_create(
    otherConnection,
    {
      body: {
        name: `other-role-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: "employee:view",
            description: "view employees",
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      },
    },
  );
  typia.assert(targetRole);
  const employee = await generate_random_erp_hrm_time_member_employees_create(
    ownerConnection,
    {
      body: {
        member_id: ownerAuth.id,
        role_id: ownerRole.id,
        employment_type: "full-time",
        department_id: null,
        position_title: RandomGenerator.name(),
      },
    },
  );
  typia.assert(employee);
  const originalRoleId = employee.erpHrmTimeRoleId;
  const originalOrganizationId = employee.erpHrmTimeOrganizationId;
  await TestValidator.httpError(
    "cross-organization role assignment should be rejected",
    [400, 404, 409, 422],
    async () => {
      await api.functional.erpHrmTime.member.role_assignment.create(
        ownerConnection,
        {
          body: {
            employeeId: employee.id,
            roleId: targetRole.id,
          } satisfies IErpHrmTimeOrganizationMembership.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "employee organization remains unchanged",
    employee.erpHrmTimeOrganizationId,
    originalOrganizationId,
  );
  TestValidator.equals(
    "employee role remains unchanged",
    employee.erpHrmTimeRoleId,
    originalRoleId,
  );
}
