import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_contracts_create } from "../../../generate/generate_random_hrm_platform_member_employees_contracts_create";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";

/**
 * Test that organization deletion is blocked when active employee contracts exist.
 *
 * Validates the organization deletion endpoint correctly rejects deletion requests
 * when the organization has employees with active employment contracts. The system
 * enforces a business rule that all active contracts must be terminated before
 * an organization can be deleted, preserving employment records and audit trails.
 *
 * The test authenticates as a new member (which auto-creates a default organization),
 * creates an employee record with an active employment contract (end_date: null),
 * and verifies that the deletion attempt is rejected with a validation error.
 *
 * 1. Authenticate as a new member to auto-create a default organization.
 * 2. Create an employee record assigned to the authenticated member.
 * 3. Create an active employment contract with end_date set to null.
 * 4. Attempt to delete the organization and verify the operation is rejected.
 */
export async function test_api_organization_deletion_blocked_by_active_contracts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member (auto-creates default organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an employee record for this member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: authorized.id,
      },
    },
  );
  typia.assert(employee);
  // 3. Create an active contract (end_date: null = ongoing employment)
  const contract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          end_date: null,
        },
      },
    );
  typia.assert(contract);
  // 4. Verify active contract has null end_date (ongoing)
  TestValidator.equals("contract is active", contract.end_date, null);
  // 5. Attempt to delete organization - should fail due to active contract
  // The server validates: no active contracts for employees in the organization
  await TestValidator.httpError(
    "deletion blocked by active contracts",
    [422],
    async () => {
      await api.functional.hrmPlatform.organizations.erase(memberConnection, {
        organizationId: employee.id,
      });
    },
  );
}
