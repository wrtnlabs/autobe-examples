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
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_admin_employees_contracts_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_historical_contract_update_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a second user account that will become an employee
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_admin_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create department for context
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(department);
  // 4. Create role with employee:manage permission
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["employee:manage"],
      },
    },
  );
  typia.assert(role);
  // 5. Create employee using the second user's email (they already have an account)
  const employeeInvitation =
    await generate_random_erp_hrm_admin_employees_create(adminConnection, {
      body: {
        email: userAuth.email,
        roleId: role.id,
        departmentId: department.id,
        employmentType: "full-time",
      },
    });
  typia.assert(employeeInvitation);
  // Extract employee ID from the invitation (which becomes an employee since email exists)
  const employeeId =
    (employeeInvitation as any).member?.id ?? (employeeInvitation as any).id;
  // 6. Create first contract with end_date in the past (historical contract)
  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 3);
  pastDate.setHours(0, 0, 0, 0);
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() - 2);
  futureDate.setHours(0, 0, 0, 0);
  const firstContract =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId: employeeId },
        body: {
          startDate: pastDate.toISOString(),
          endDate: futureDate.toISOString(),
          payRate: 5000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
        },
      },
    );
  typia.assert(firstContract);
  // 7. Create second contract starting after first contract ends
  // This automatically ends the first contract per system rules
  const secondContractStart = new Date();
  secondContractStart.setMonth(secondContractStart.getMonth() - 1);
  secondContractStart.setHours(0, 0, 0, 0);
  const secondContract =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId: employeeId },
        body: {
          startDate: secondContractStart.toISOString(),
          payRate: 5500,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
        },
      },
    );
  typia.assert(secondContract);
  // 8. Attempt to update the first (historical) contract - should be rejected
  await TestValidator.error(
    "historical contract update should be rejected",
    async () => {
      await api.functional.erpHrm.admin.employees.contracts.update(
        adminConnection,
        {
          employeeId: employeeId,
          contractId: firstContract.id,
          body: {
            payRate: 6000,
          } satisfies IErpHrmContract.IUpdate,
        },
      );
    },
  );
}
