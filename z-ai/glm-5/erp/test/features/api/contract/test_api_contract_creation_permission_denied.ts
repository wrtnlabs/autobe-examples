import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_member_employees_contracts_create";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

export async function test_api_contract_creation_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager account (organization owner with employee:manage permission)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {});
  typia.assert(managerAuth);
  // 2. Create a second member account (regular employee)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeAuth);
  // 3. Manager creates employee record for themselves (as owner with full permissions)
  const managerEmployee = await generate_random_erp_hrm_member_employees_create(
    managerConnection,
    {
      body: {
        email: managerAuth.email,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(managerEmployee);
  // 4. Manager creates employee record for the second member with Employee role
  // Note: Employee role has limited permissions (no employee:manage)
  const regularEmployee = await generate_random_erp_hrm_member_employees_create(
    managerConnection,
    {
      body: {
        email: employeeAuth.email,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(regularEmployee);
  // 5. Regular employee attempts to create a contract for manager's employee
  // This should fail with 403 Forbidden since regular employee lacks employee:manage permission
  await TestValidator.httpError(
    "contract creation denied for member without employee:manage permission",
    403,
    async () => {
      await api.functional.erpHrm.member.employees.contracts.create(
        employeeConnection,
        {
          employeeId: managerEmployee.id,
          body: {
            start_date: new Date().toISOString(),
            pay_rate: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
            pay_period: "monthly",
            working_hours_per_week: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<40>
            >(),
          } satisfies IErpHrmContract.ICreate,
        },
      );
    },
  );
}
