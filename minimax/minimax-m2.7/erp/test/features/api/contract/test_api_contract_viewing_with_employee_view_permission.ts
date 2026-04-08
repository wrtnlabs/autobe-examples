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

export async function test_api_contract_viewing_with_employee_view_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account (org owner)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAccount);
  // 2. Create organization - creator becomes owner and employee
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create role with employee:view permission (for the viewing employee)
  const viewerRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: ["employee:view" as const],
      },
    },
  );
  typia.assert(viewerRole);
  // 4. Create basic employee role (for the target employee)
  const basicRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: ["project:view" as const],
      },
    },
  );
  typia.assert(basicRole);
  // 5. Create viewer admin account (will be added as employee with employee:view role)
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewerAccount = await authorize_admin_join(viewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(viewerAccount);
  // 6. Create target admin account (will own the contract)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAccount = await authorize_admin_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetAccount);
  // 7. Add viewer as employee with employee:view role
  await generate_random_erp_hrm_admin_employees_create(adminConnection, {
    body: {
      email: viewerAccount.email,
      roleId: viewerRole.id,
      employmentType: "full-time",
    },
  });
  // 8. Add target as employee with basic role
  await generate_random_erp_hrm_admin_employees_create(adminConnection, {
    body: {
      email: targetAccount.email,
      roleId: basicRole.id,
      employmentType: "full-time",
    },
  });
  // Get employee IDs - use the member IDs from admin accounts
  // In ERP HRM, member ID = employee ID for the employee's record in an org
  const viewerEmployeeId = viewerAccount.id;
  const targetEmployeeId = targetAccount.id;
  // 9. Create contract for target employee
  const contractResponse =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: {
          employeeId: targetEmployeeId,
        },
        body: {
          startDate: new Date().toISOString(),
          payRate: 5000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
        },
      },
    );
  typia.assert(contractResponse);
  const contractId = contractResponse.id;
  // 10. View contract as the viewer employee (with employee:view permission)
  const viewedContract =
    await api.functional.erpHrm.admin.employees.contracts.at(viewerConnection, {
      employeeId: targetEmployeeId,
      contractId: contractId,
    });
  typia.assert(viewedContract);
  // 11. Validate the contract belongs to target employee (not viewer)
  TestValidator.equals(
    "contract employee id matches target employee",
    viewedContract.employee.id,
    targetEmployeeId,
  );
  // 12. Validate contract details are present and correct
  TestValidator.equals("contract id matches", viewedContract.id, contractId);
  TestValidator.predicate("pay rate is positive", viewedContract.payRate > 0);
  TestValidator.predicate(
    "working hours are positive",
    viewedContract.workingHoursPerWeek > 0,
  );
}
