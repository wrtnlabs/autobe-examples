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

export async function test_api_employee_role_assignment_update(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "!Aa1",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const managerRole = await generate_random_erp_hrm_time_member_roles_create(
    ownerConnection,
    {
      body: {
        name: `manager-${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: "employee:manage",
            description: "Manage employees",
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(managerRole);
  const employee = await generate_random_erp_hrm_time_member_employees_create(
    ownerConnection,
    {
      body: {
        member_id: owner.id,
        role_id: managerRole.id,
        employment_type: "full-time",
      } satisfies IErpHrmTimeEmployeeDashboardSummary.ICreate,
    },
  );
  typia.assert(employee);
  const targetRole = await generate_random_erp_hrm_time_member_roles_create(
    ownerConnection,
    {
      body: {
        name: `lead-${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: "employee:manage",
            description: "Manage employees",
          } satisfies IErpHrmTimePermission.ISummary,
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: "employee:view",
            description: "View employees",
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(targetRole);
  const updated =
    await generate_random_erp_hrm_time_member_role_assignment_create(
      ownerConnection,
      {
        body: {
          employeeId: employee.id,
          roleId: targetRole.id,
        } satisfies IErpHrmTimeOrganizationMembership.ICreate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("employee id preserved", updated.id, employee.id);
  TestValidator.equals(
    "organization id preserved",
    updated.erpHrmTimeOrganizationId,
    employee.erpHrmTimeOrganizationId,
  );
  TestValidator.equals(
    "member preserved",
    updated.erpHrmTimeMemberId,
    employee.erpHrmTimeMemberId,
  );
  TestValidator.equals("role updated", updated.erpHrmTimeRoleId, targetRole.id);
  TestValidator.notEquals(
    "role changed in place",
    updated.erpHrmTimeRoleId,
    employee.erpHrmTimeRoleId,
  );
  const foreignConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(foreignConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "!Aa1",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const foreignRole = await generate_random_erp_hrm_time_member_roles_create(
    foreignConnection,
    {
      body: {
        name: `foreign-${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: "employee:view",
            description: "View employees",
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(foreignRole);
  await TestValidator.error(
    "reject cross-organization role assignment",
    async () => {
      await api.functional.erpHrmTime.member.role_assignment.create(
        ownerConnection,
        {
          body: {
            employeeId: employee.id,
            roleId: foreignRole.id,
          } satisfies IErpHrmTimeOrganizationMembership.ICreate,
        },
      );
    },
  );
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorized = await authorize_member_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "!Aa1",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(unauthorized);
  await TestValidator.error(
    "reject caller without employee-management permission",
    async () => {
      await api.functional.erpHrmTime.member.role_assignment.create(
        unauthorizedConnection,
        {
          body: {
            employeeId: employee.id,
            roleId: targetRole.id,
          } satisfies IErpHrmTimeOrganizationMembership.ICreate,
        },
      );
    },
  );
}
