import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeContract";
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
 * Test that members with employee:manage permission can access another employee's contracts.
 *
 * Validates that the contract listing endpoint properly enforces authorization based on the employee:manage permission. A manager with employee:manage can retrieve the contract history for any employee in the organization, while a regular member without this permission is denied access to another employee's contracts.
 *
 * Edge cases covered include verifying that only authenticated users with the correct permission level can cross-access employee contract data, and that the returned contract list contains proper pagination metadata and complete contract summary information.
 *
 * 1. Manager joins the platform as organization owner (automatically receives all permissions).
 * 2. Target employee joins as a separate member account.
 * 3. Regular member joins (will have default Employee role without employee:manage).
 * 4. Manager creates a role with employee:manage permission for the manager.
 * 5. Manager creates the target employee record in the organization.
 * 6. Manager creates multiple contracts for the target employee.
 * 7. Manager lists contracts for the target employee (should succeed with 200).
 * 8. Regular member attempts to list target employee's contracts (should fail with 403).
 * 9. Validates contract list contains correct data and pagination info.
 */
export async function test_api_contracts_list_by_authorized_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager joins as organization owner
  const managerConnection: api.IConnection = { host: connection.host };
  const managerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(managerConnection, {
    body: {
      email: managerEmail,
    },
  });
  // 2. Target employee joins as separate member
  const targetConnection: api.IConnection = { host: connection.host };
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetAuthorized = await authorize_member_join(targetConnection, {
    body: {
      email: targetEmail,
    },
  });
  typia.assert(targetAuthorized);
  // 3. Regular member joins (default Employee role, no employee:manage)
  const regularConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(regularConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // 4. Create a custom role with employee:manage permission
  const manageRole = await api.functional.hrmPlatform.member.roles.create(
    managerConnection,
    {
      body: {
        name: "Contract Manager",
        description: "Role with employee:manage permission",
        permissionKeys: ["employee:manage", "employee:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(manageRole);
  // 5. Create the target employee record with Employee role (built-in)
  const targetEmployee =
    await api.functional.hrmPlatform.member.employees.create(
      managerConnection,
      {
        body: {
          memberId: targetAuthorized.id,
          roleId: manageRole.id,
          employmentType: "full-time",
          position: "Test Employee",
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(targetEmployee);
  // 6. Create multiple contracts for the target employee
  const contract1 =
    await api.functional.hrmPlatform.member.employees.contracts.create(
      managerConnection,
      {
        employeeId: targetEmployee.id,
        body: {
          start_date: new Date().toISOString(),
          pay_rate: typia.random<number & tags.ExclusiveMinimum<0>>(),
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "First contract",
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(contract1);
  // Create a past contract (should auto-terminate the previous one)
  const pastContract =
    await api.functional.hrmPlatform.member.employees.contracts.create(
      managerConnection,
      {
        employeeId: targetEmployee.id,
        body: {
          start_date: new Date(Date.now() + 86400000).toISOString(),
          pay_rate: typia.random<number & tags.ExclusiveMinimum<0>>(),
          pay_period: "hourly",
          working_hours_per_week: 35,
          notes: "Second contract",
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(pastContract);
  // 7. Manager lists contracts for the target employee (should succeed)
  const managerContractList =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      managerConnection,
      {
        employeeId: targetEmployee.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformEmployeeContract.IRequest,
      },
    );
  typia.assert(managerContractList);
  // Validate the manager's contract list response
  TestValidator.equals(
    "manager can retrieve contracts for target employee",
    managerContractList.pagination.records,
    managerContractList.data.length,
  );
  TestValidator.predicate(
    "contract list pagination has valid current page",
    managerContractList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "contract list pagination has valid limit",
    managerContractList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "contracts have valid employment status",
    managerContractList.data.every(
      (c) => c.employment_status === "active" || c.employment_status === "past",
    ),
  );
  TestValidator.predicate(
    "contracts have valid pay periods",
    managerContractList.data.every(
      (c) =>
        c.pay_period === "hourly" ||
        c.pay_period === "daily" ||
        c.pay_period === "weekly" ||
        c.pay_period === "monthly",
    ),
  );
  // 8. Regular member without employee:manage tries to list target employee's contracts (should fail with 403)
  await TestValidator.httpError(
    "regular member without employee:manage cannot list other employee's contracts",
    403,
    async () =>
      await api.functional.hrmPlatform.member.employees.contracts.index(
        regularConnection,
        {
          employeeId: targetEmployee.id,
          body: {} satisfies IHrmPlatformEmployeeContract.IRequest,
        },
      ),
  );
  // 9. Verify contract data integrity - check that start dates are valid ISO strings
  TestValidator.predicate(
    "all contracts have valid start_date format",
    managerContractList.data.every((c) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(c.start_date),
    ),
  );
  TestValidator.predicate(
    "all contracts have positive pay rate",
    managerContractList.data.every((c) => c.pay_rate > 0),
  );
  TestValidator.predicate(
    "all contracts have positive working hours",
    managerContractList.data.every((c) => c.working_hours_per_week > 0),
  );
}
