import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Verify that member lacking employee:manage permission cannot delete employee contracts and receives 403 Forbidden.
 *
 * Validates the permission enforcement for contract deletion operations by testing a member who has only employee:view permission but lacks the required employee:manage permission. The test creates a restrictive custom role, assigns it to a test member, and confirms that the server rejects unauthorized deletion attempts while preserving the contract data.
 *
 * Special attention is given to verifying that the contract remains completely unchanged after the failed deletion attempt, including checking that deleted_at stays null.
 *
 * 1. Organization owner authenticates to set up test environment.
 * 2. Custom role is created with only employee:view permission (no employee:manage).
 * 3. Second member (viewer) authenticates as a separate account.
 * 4. Viewer is invited as employee with the restrictive view-only role.
 * 5. Owner creates an employment contract for the viewer employee.
 * 6. Viewer attempts to delete the contract and receives 403 Forbidden.
 * 7. Contract integrity is verified to remain unchanged after the failed attempt.
 */
export async function test_api_employee_contract_delete_unauthorized_missing_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Organization owner authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create custom role with only employee:view permission (no employee:manage)
  const viewOnlyRole = await api.functional.hrmPlatform.member.roles.create(
    ownerConnection,
    {
      body: {
        name: "ViewOnlyRole-" + RandomGenerator.alphabets(6),
        description: "Role with only employee:view permission",
        permissionKeys: ["employee:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(viewOnlyRole);
  // 3. Second member (viewer) authentication
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewerAuth = await authorize_member_join(viewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(viewerAuth);
  // 4. Invite viewer as employee with the restrictive view-only role
  const employee = await api.functional.hrmPlatform.member.employees.create(
    ownerConnection,
    {
      body: {
        memberId: viewerAuth.id,
        roleId: viewOnlyRole.id,
        employmentType: "full-time",
        position: "Test Employee",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 5. Owner creates employment contract for the viewer employee
  const payPeriods = ["hourly", "daily", "weekly", "monthly"] as const;
  const contract =
    await api.functional.hrmPlatform.member.employees.contracts.create(
      ownerConnection,
      {
        employeeId: employee.id,
        body: {
          start_date: new Date().toISOString(),
          end_date: null,
          pay_rate: typia.random<number & tags.ExclusiveMinimum<0>>(),
          pay_period: RandomGenerator.pick(payPeriods),
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<60>
          >() satisfies number as number & tags.Type<"int32">,
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(contract);
  // 6. Viewer attempts to delete contract - expects 403 Forbidden
  await TestValidator.httpError(
    "viewer without employee:manage permission receives 403 on contract deletion",
    403,
    async () =>
      await api.functional.hrmPlatform.member.employees.contracts.erase(
        viewerConnection,
        {
          employeeId: employee.id,
          contractId: contract.id,
        },
      ),
  );
  // 7. Verify contract remains active (deleted_at is still null)
  TestValidator.predicate(
    "contract deleted_at remains null after unauthorized deletion attempt",
    contract.deleted_at === null,
  );
}
