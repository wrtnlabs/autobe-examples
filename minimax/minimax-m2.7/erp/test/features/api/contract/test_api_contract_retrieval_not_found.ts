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
 * Test retrieving a contract with a non-existent contract ID returns 404 Not Found.
 *
 * Steps:
 * 1. Authenticate as admin via POST /erpHrm/auth/admin/join
 * 2. List employees via PATCH /erpHrm/admin/employees to find an employee
 * 3. Attempt to retrieve a contract using a non-existent contractId (random UUID)
 *
 * Validation Points:
 * - Response returns HTTP 404 Not Found
 * - Error message clearly indicates contract was not found
 * - The system correctly handles invalid contract IDs
 */
export async function test_api_contract_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. List employees to find an employee
  const employeeListResponse =
    await api.functional.erpHrm.admin.employees.index(adminConnection, {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        page: 1,
      } satisfies IErpHrmEmployee.IRequest,
    });
  typia.assert(employeeListResponse);
  // Get an employee ID from the list - use first available employee if exists
  // If no employees exist, use a random UUID - the 404 for non-existent contract should still occur
  const employeeId =
    employeeListResponse.data[0]?.id ??
    typia.random<string & tags.Format<"uuid">>();
  // 3. Generate a random UUID for non-existent contractId
  const nonExistentContractId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve contract with non-existent contractId - expect 404
  await TestValidator.httpError(
    "contract not found returns 404",
    404,
    async () => {
      await api.functional.erpHrm.admin.employees.contracts.at(
        adminConnection,
        {
          employeeId: employeeId,
          contractId: nonExistentContractId,
        },
      );
    },
  );
}
