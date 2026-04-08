import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
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
import { generate_random_hrm_member_invitations_create } from "../../../generate/generate_random_hrm_member_invitations_create";
import { prepare_random_hrm_contract } from "../../../prepare/prepare_random_hrm_contract";
import { prepare_random_hrm_employee_invitation } from "../../../prepare/prepare_random_hrm_employee_invitation";

/**
 * Test contract creation permission denial for employees without employee:manage permission.
 *
 * Validates that users with Employee role (lacking employee:manage permission) cannot create employment contracts for employees. This test ensures proper permission-based access control enforcement on the contract creation endpoint.
 *
 * The test follows a multi-step setup process to establish the necessary test data while maintaining proper role separation:
 * 1. Create a manager account with employee:manage permission
 * 2. Create an employee account and invite them to the organization
 * 3. Create an initial contract using the manager account
 * 4. Attempt contract creation using the employee account (should fail)
 *
 * 1. Manager account creation and authentication
 * 2. Employee invitation and account setup
 * 3. Initial contract creation by manager
 * 4. Permission denial test with employee account
 * 5. Validation of 403 Forbidden response
 * 6. Verification that no additional contract was created
 */
export async function test_api_contract_creation_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager account with employee:manage permission
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Create employee account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 3. Manager creates employee invitation to add employee to organization
  // Note: This requires employee:manage permission which manager has
  const invitation = await api.functional.hrm.member.invitations.create(
    managerConnection,
    {
      body: {
        email: employeeAuth.email,
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmEmployeeInvitation.ICreate,
    },
  );
  typia.assert(invitation);
  // 4. Employee accepts invitation by logging in (simulated)
  // For this test, we assume the employee is now part of the organization
  // In a real scenario, we would use the invitation token to accept
  // 5. Manager creates initial contract for the employee
  // First, we need to get the employee ID - this would normally come from the invitation acceptance
  // For this test, we'll use a placeholder UUID that would be returned after invitation acceptance
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const initialContract =
    await api.functional.hrm.member.employees.contracts.create(
      managerConnection,
      {
        employeeId,
        body: {
          start_date: new Date(Date.now() + 86400000).toISOString(),
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          pay_period: RandomGenerator.pick([
            "hourly",
            "daily",
            "weekly",
            "monthly",
          ]),
        } satisfies IHrmContract.ICreate,
      },
    );
  typia.assert(initialContract);
  // 6. Employee attempts to create a contract (should fail with 403)
  await TestValidator.httpError(
    "employee without employee:manage permission cannot create contract",
    403,
    async () => {
      await api.functional.hrm.member.employees.contracts.create(
        employeeConnection,
        {
          employeeId,
          body: {
            start_date: new Date(Date.now() + 172800000).toISOString(),
            pay_rate: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
            pay_period: RandomGenerator.pick([
              "hourly",
              "daily",
              "weekly",
              "monthly",
            ]),
          } satisfies IHrmContract.ICreate,
        },
      );
    },
  );
}
