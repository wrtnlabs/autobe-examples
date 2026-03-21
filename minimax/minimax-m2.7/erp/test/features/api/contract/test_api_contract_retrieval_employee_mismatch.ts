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

export async function test_api_contract_retrieval_employee_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 1: List employees to find at least two employees
  const employeesPage = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(employeesPage);
  // Need at least 2 employees for this test
  TestValidator.predicate(
    "at least 2 employees exist",
    employeesPage.data.length >= 2,
  );
  const firstEmployee = employeesPage.data[0]!;
  const secondEmployee = employeesPage.data[1]!;
  // Step 2: List contracts for the first employee
  const contractsPage =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: firstEmployee.id,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(contractsPage);
  // Need at least 1 contract for this test
  TestValidator.predicate(
    "at least 1 contract exists",
    contractsPage.data.length >= 1,
  );
  const firstContract = contractsPage.data[0]!;
  // Step 3: Attempt to retrieve the contract using the SECOND employee's ID
  // This should return 404 Not Found because the contract belongs to the first employee
  await TestValidator.httpError(
    "contract retrieval with mismatched employeeId returns 404",
    404,
    async () =>
      await api.functional.erpHrm.admin.employees.contracts.at(
        adminConnection,
        {
          employeeId: secondEmployee.id,
          contractId: firstContract.id,
        },
      ),
  );
}
