import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import type { IPageIErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving a specific employment contract by its unique identifier within an employee's contract history.
 *
 * Steps:
 * 1. Authenticate as admin via POST /auth/admin/join
 * 2. List employees via PATCH /admin/employees to find an employee with contracts
 * 3. List contracts for that employee via PATCH /admin/employees/{employeeId}/contracts
 * 4. Retrieve the contract using GET /admin/employees/{employeeId}/contracts/{contractId}
 *
 * Validation Points:
 * - Contract fields are present: id, start_date, end_date, pay_rate, pay_period, working_hours_per_week, notes
 * - Employee summary is included in the response
 * - Timestamps (created_at, updated_at) are populated
 * - Contract's employee_id matches the requested employeeId
 */
export async function test_api_contract_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. List employees to find one with contracts
  const employeePage = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(employeePage);
  // Find an employee from the list (use first employee if available)
  const targetEmployee = employeePage.data[0];
  // 3. If no employees exist, skip the test
  if (!targetEmployee) {
    return;
  }
  // List contracts for the employee
  const contractPage =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: targetEmployee.id,
        body: {
          limit: 100,
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(contractPage);
  // Find a contract to retrieve
  const targetContract = contractPage.data[0];
  // 4. If no contracts exist, skip the test
  if (!targetContract || !targetContract.id) {
    return;
  }
  // Retrieve the specific contract
  const contract = await api.functional.erpHrm.admin.employees.contracts.at(
    adminConnection,
    {
      employeeId: targetEmployee.id,
      contractId: targetContract.id,
    },
  );
  typia.assert(contract);
  // Validation: Contract fields are present
  TestValidator.predicate(
    "contract has id",
    contract.id !== undefined && contract.id !== null,
  );
  TestValidator.predicate(
    "contract has start_date",
    contract.start_date !== undefined,
  );
  TestValidator.predicate(
    "contract has pay_rate",
    contract.pay_rate !== undefined,
  );
  TestValidator.predicate(
    "contract has pay_period",
    contract.pay_period !== undefined,
  );
  TestValidator.predicate(
    "contract has working_hours_per_week",
    contract.working_hours_per_week !== undefined,
  );
  // Validation: Employee summary is included
  TestValidator.predicate(
    "contract has employee summary",
    contract.employee !== undefined && contract.employee !== null,
  );
  // Validation: Timestamps are populated
  TestValidator.predicate(
    "contract has created_at",
    contract.created_at !== undefined && contract.created_at !== null,
  );
  TestValidator.predicate(
    "contract has updated_at",
    contract.updated_at !== undefined && contract.updated_at !== null,
  );
  // Validation: Contract's employee_id matches the requested employeeId
  TestValidator.equals(
    "contract belongs to requested employee",
    contract.employee?.id,
    targetEmployee.id,
  );
}
