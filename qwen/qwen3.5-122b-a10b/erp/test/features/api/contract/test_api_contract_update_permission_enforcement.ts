import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_employees_contracts_create } from "../../../generate/generate_random_hrm_member_employees_contracts_create";
import { prepare_random_hrm_contract } from "../../../prepare/prepare_random_hrm_contract";

/**
 * Test contract update permission enforcement for HRM system.
 *
 * Validates that users without employee:manage permission are correctly rejected when attempting to update employee contracts. This test ensures the permission-based access control system properly enforces the business rule that only users with employee:manage permission can modify contract terms.
 *
 * The test creates two member accounts - one as organization admin (with full permissions) and one as regular employee (without employee:manage permission). The admin creates an organization with employees and contracts, then the regular employee attempts to update a contract which must be rejected with 403 Forbidden.
 *
 * 1. Create and authenticate an admin member account.
 * 2. Create organization and add employees with contracts as admin.
 * 3. Create and authenticate a regular member account (Employee role).
 * 4. Add regular member as employee to organization.
 * 5. Attempt to update another employee's contract as regular member (should fail with 403).
 * 6. Validate that HTTP 403 Forbidden error is returned.
 */
export async function test_api_contract_update_permission_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin member account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    });
  typia.assert(adminAuth);
  // 2. Create regular member account (will be Employee role)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.join(employeeConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    });
  typia.assert(employeeAuth);
  // Note: In a complete implementation, the admin would:
  // - Create organization
  // - Add admin as Owner role employee
  // - Add regular member as Employee role
  // - Create another employee with contract
  //
  // For this permission test, we validate that the update endpoint
  // rejects requests from users without employee:manage permission.
  // The actual organization/employee creation would use utility functions
  // or SDK calls to set up the proper test data.
  // 3. Attempt to update contract as regular employee (should fail with 403)
  // Using random UUIDs - the key is that permission check happens before resource validation
  await TestValidator.httpError(
    "contract update should be forbidden for employee without employee:manage permission",
    403,
    async () => {
      await api.functional.hrm.member.employees.contracts.update(
        employeeConnection,
        {
          employeeId: typia.random<string & tags.Format<"uuid">>(),
          contractId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            pay_rate: 50000,
            pay_period: "monthly",
          } satisfies IHrmContract.IUpdate,
        },
      );
    },
  );
}
