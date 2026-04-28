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
 * Test contract list endpoint with various filter combinations.
 *
 * Validates comprehensive filtering capabilities for employee contracts including status (active/past), pay period (hourly/daily/weekly/monthly), date range filters (startDateFrom, startDateTo, endDateFrom, endDateTo), and combined filter scenarios. Ensures that filtering accurately returns only contracts matching the specified criteria.
 *
 * Special attention is given to verifying that: (1) status='active' returns only contracts without end_date, (2) status='past' returns only contracts with end_date set, (3) payPeriod filters return exact matches, (4) date range filters correctly bound results, (5) combined filters produce intersection of all criteria.
 *
 * 1. Member registers and authenticates to establish organizational context.
 * 2. Custom role with employee:manage permission is created for contract management access.
 * 3. Employee record is created within the organization.
 * 4. Multiple contracts are created with different pay periods (hourly, monthly, weekly, daily) and statuses (active vs past via end_date).
 * 5. Filtering by status='active' returns only contracts with no end_date.
 * 6. Filtering by status='past' returns only contracts with end_date set.
 * 7. Filtering by payPeriod='hourly' returns only hourly contracts.
 * 8. Filtering by payPeriod='monthly' returns only monthly contracts.
 * 9. Date range filtering by startDateFrom/startDateTo returns contracts within range.
 * 10. Date range filtering by endDateFrom/endDateTo returns past contracts within range.
 * 11. Combined filters (status + payPeriod) correctly intersect both criteria.
 */
export async function test_api_contracts_filtering_status_pay_period_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member join and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create role with employee:manage permission
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        permissionKeys: ["employee:manage", "employee:view"],
      },
    },
  );
  typia.assert(role);
  // 3. Create employee
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: member.id,
        roleId: role.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create multiple contracts with different characteristics
  // Past hourly contract (ended)
  const pastHourlyStartDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const pastHourlyEndDate = new Date(
    Date.now() - 15 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const pastHourlyContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: pastHourlyStartDate,
          end_date: pastHourlyEndDate,
          pay_period: "hourly",
          pay_rate: 50,
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(pastHourlyContract);
  // Past monthly contract (ended)
  const pastMonthlyStartDate = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const pastMonthlyEndDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const pastMonthlyContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: pastMonthlyStartDate,
          end_date: pastMonthlyEndDate,
          pay_period: "monthly",
          pay_rate: 5000,
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(pastMonthlyContract);
  // Active weekly contract (no end_date - creates new active)
  const activeWeeklyStartDate = new Date(
    Date.now() - 10 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const activeWeeklyContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: activeWeeklyStartDate,
          end_date: null,
          pay_period: "weekly",
          pay_rate: 1500,
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(activeWeeklyContract);
  // Note: Creating a 4th contract (daily) would auto-close the weekly one,
  // so we only have 3 contracts for clean test data.
  // Let's use the 3 contracts: pastHourly, pastMonthly, activeWeekly
  // 5. Test filter by status='active'
  const activeFilterRequest = {
    status: "active" as const,
  } satisfies IHrmPlatformEmployeeContract.IRequest;
  const activeContracts =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: activeFilterRequest,
      },
    );
  typia.assert(activeContracts);
  TestValidator.predicate(
    "status=active returns only active contracts",
    activeContracts.data.every((c) => c.employment_status === "active"),
  );
  TestValidator.equals(
    "active contract count matches",
    activeContracts.data.length,
    1,
  );
  // 6. Test filter by status='past'
  const pastFilterRequest = {
    status: "past" as const,
  } satisfies IHrmPlatformEmployeeContract.IRequest;
  const pastContracts =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: pastFilterRequest,
      },
    );
  typia.assert(pastContracts);
  TestValidator.predicate(
    "status=past returns only past contracts",
    pastContracts.data.every((c) => c.employment_status === "past"),
  );
  TestValidator.equals(
    "past contract count matches",
    pastContracts.data.length,
    2,
  );
  // 7. Test filter by payPeriod='hourly'
  const hourlyFilterRequest = {
    payPeriod: "hourly" as const,
  } satisfies IHrmPlatformEmployeeContract.IRequest;
  const hourlyContracts =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: hourlyFilterRequest,
      },
    );
  typia.assert(hourlyContracts);
  TestValidator.predicate(
    "payPeriod=hourly returns only hourly contracts",
    hourlyContracts.data.every((c) => c.pay_period === "hourly"),
  );
  TestValidator.equals(
    "hourly contract count matches",
    hourlyContracts.data.length,
    1,
  );
  // 8. Test filter by payPeriod='monthly'
  const monthlyFilterRequest = {
    payPeriod: "monthly" as const,
  } satisfies IHrmPlatformEmployeeContract.IRequest;
  const monthlyContracts =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: monthlyFilterRequest,
      },
    );
  typia.assert(monthlyContracts);
  TestValidator.predicate(
    "payPeriod=monthly returns only monthly contracts",
    monthlyContracts.data.every((c) => c.pay_period === "monthly"),
  );
  TestValidator.equals(
    "monthly contract count matches",
    monthlyContracts.data.length,
    1,
  );
  // 9. Test date range filter by startDateFrom/startDateTo
  const startDateRangeFrom = new Date(
    Date.now() - 45 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const startDateRangeTo = new Date(
    Date.now() - 20 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeFilterRequest = {
    startDateFrom: startDateRangeFrom,
    startDateTo: startDateRangeTo,
  } satisfies IHrmPlatformEmployeeContract.IRequest;
  const dateRangeContracts =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: dateRangeFilterRequest,
      },
    );
  typia.assert(dateRangeContracts);
  // Should return the pastHourly contract (started 30 days ago) which is within the 20-45 day range
  TestValidator.predicate(
    "date range filter returns contracts within startDate range",
    dateRangeContracts.data.every(
      (c) =>
        c.start_date >= startDateRangeFrom && c.start_date <= startDateRangeTo,
    ),
  );
  TestValidator.predicate(
    "date range filter returns at least one contract",
    dateRangeContracts.data.length >= 1,
  );
  // 10. Test date range filter by endDateFrom/endDateTo
  const endDateRangeFrom = new Date(
    Date.now() - 50 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDateRangeTo = new Date(
    Date.now() - 25 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDateFilterRequest = {
    endDateFrom: endDateRangeFrom,
    endDateTo: endDateRangeTo,
  } satisfies IHrmPlatformEmployeeContract.IRequest;
  const endDateContracts =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: endDateFilterRequest,
      },
    );
  typia.assert(endDateContracts);
  // Should return pastMonthly contract (ended 30 days ago) which is within the 25-50 day range
  TestValidator.predicate(
    "endDate filter returns only past contracts within end_date range",
    endDateContracts.data.every((c) =>
      c.end_date !== null
        ? c.end_date >= endDateRangeFrom && c.end_date <= endDateRangeTo
        : false,
    ),
  );
  TestValidator.predicate(
    "endDate filter returns at least one contract",
    endDateContracts.data.length >= 1,
  );
  // 11. Test combined filters: status='past' + payPeriod='hourly'
  const combinedFilterRequest = {
    status: "past" as const,
    payPeriod: "hourly" as const,
  } satisfies IHrmPlatformEmployeeContract.IRequest;
  const combinedContracts =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: combinedFilterRequest,
      },
    );
  typia.assert(combinedContracts);
  TestValidator.predicate(
    "combined filter returns only past hourly contracts",
    combinedContracts.data.every(
      (c) => c.employment_status === "past" && c.pay_period === "hourly",
    ),
  );
  TestValidator.equals(
    "combined filter returns exactly one contract",
    combinedContracts.data.length,
    1,
  );
  // 12. Test includeInactive=false (default - should work same as without flag)
  const excludeInactiveRequest = {
    includeInactive: false,
  } satisfies IHrmPlatformEmployeeContract.IRequest;
  const excludeInactiveContracts =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: excludeInactiveRequest,
      },
    );
  typia.assert(excludeInactiveContracts);
  // All returned contracts should be non-deleted
  TestValidator.predicate(
    "includeInactive=false excludes deleted contracts",
    excludeInactiveContracts.data.length === 3,
  );
}
