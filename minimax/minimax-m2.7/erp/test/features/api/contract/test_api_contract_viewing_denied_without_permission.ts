import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_admin_employees_contracts_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_contract_viewing_denied_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and organization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create a basic role WITHOUT employee:view permission
  const basicRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["project:view"] as const,
      },
    },
  );
  typia.assert(basicRole);
  // 4. Create a role WITH employee:view permission (for employee B who owns the contract)
  const viewerRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["employee:view", "project:view"] as const,
      },
    },
  );
  typia.assert(viewerRole);
  // 5. Create employee A with basic role (without employee:view permission)
  const employeeAConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(employeeAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const employeeA = await generate_random_erp_hrm_admin_employees_create(
    employeeAConnection,
    {
      body: {
        roleId: basicRole.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employeeA);
  // 6. Create employee B with viewer role (has employee:view permission)
  const employeeBConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(employeeBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const employeeB = await generate_random_erp_hrm_admin_employees_create(
    employeeBConnection,
    {
      body: {
        roleId: viewerRole.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employeeB);
  // Extract employee B's ID from the response
  const employeeBId: string & tags.Format<"uuid"> = (
    employeeB as unknown as {
      employee: {
        id: string & tags.Format<"uuid">;
      };
    }
  ).employee.id;
  // 7. Create contract for employee B (as admin with full permissions)
  const contract =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId: employeeBId },
      },
    );
  typia.assert(contract);
  const contractId = contract.id;
  // 8. As employee A (without employee:view), attempt to GET employee B's contract
  // 9. Validate response returns 403 Forbidden
  await TestValidator.httpError(
    "contract viewing denied without employee:view permission",
    403,
    async () =>
      await api.functional.erpHrm.admin.employees.contracts.at(
        employeeAConnection,
        {
          employeeId: employeeBId,
          contractId: contractId,
        },
      ),
  );
}
