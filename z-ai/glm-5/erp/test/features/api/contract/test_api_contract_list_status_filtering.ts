import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
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

export async function test_api_contract_list_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // Create employee
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // Define dates for different contract periods
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days in future
  // Create historical contract (end_date in past)
  const historicalContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: new Date(
            pastDate.getTime() - 60 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: pastDate.toISOString(),
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        } satisfies IErpHrmContract.ICreate,
      },
    );
  typia.assert(historicalContract);
  // Create active contract (start_date in past, end_date null)
  const activeContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: new Date(
            pastDate.getTime() + 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: null,
          pay_rate: 60000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        } satisfies IErpHrmContract.ICreate,
      },
    );
  typia.assert(activeContract);
  // Create upcoming contract (start_date in future)
  const upcomingContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: futureDate.toISOString(),
          pay_rate: 70000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        } satisfies IErpHrmContract.ICreate,
      },
    );
  typia.assert(upcomingContract);
  // Test 1: Filter by status='active'
  const activeResult =
    await api.functional.erpHrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: { status: "active" } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(activeResult);
  TestValidator.equals("active contracts count", activeResult.data.length, 1);
  TestValidator.equals(
    "active contract id",
    activeResult.data[0].id,
    activeContract.id,
  );
  TestValidator.predicate(
    "active contract isActive field",
    activeResult.data[0].isActive,
  );
  // Test 2: Filter by status='past'
  const pastResult =
    await api.functional.erpHrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: { status: "past" } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(pastResult);
  TestValidator.equals("past contracts count", pastResult.data.length, 1);
  TestValidator.equals(
    "past contract id",
    pastResult.data[0].id,
    historicalContract.id,
  );
  TestValidator.predicate(
    "past contract isActive field",
    !pastResult.data[0].isActive,
  );
  // Test 3: Filter by status='upcoming'
  const upcomingResult =
    await api.functional.erpHrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: { status: "upcoming" } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(upcomingResult);
  TestValidator.equals(
    "upcoming contracts count",
    upcomingResult.data.length,
    1,
  );
  TestValidator.equals(
    "upcoming contract id",
    upcomingResult.data[0].id,
    upcomingContract.id,
  );
  TestValidator.predicate(
    "upcoming contract isActive field",
    !upcomingResult.data[0].isActive,
  );
  // Test 4: Get all contracts without status filter
  const allResult =
    await api.functional.erpHrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {} satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.equals("all contracts count", allResult.data.length, 3);
  // Test 5: Date range filters - startDateFrom
  const startDateFromResult =
    await api.functional.erpHrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          startDateFrom: pastDate.toISOString(),
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(startDateFromResult);
  TestValidator.predicate(
    "startDateFrom returns correct contracts",
    startDateFromResult.data.some(
      (c) => c.id === activeContract.id || c.id === upcomingContract.id,
    ),
  );
  // Test 6: Date range filters - endDateTo (should exclude ongoing contracts)
  const endDateToResult =
    await api.functional.erpHrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          endDateTo: now.toISOString(),
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(endDateToResult);
  TestValidator.equals(
    "endDateTo returns only past contracts",
    endDateToResult.data.length,
    1,
  );
  TestValidator.equals(
    "endDateTo contract id",
    endDateToResult.data[0].id,
    historicalContract.id,
  );
  // Test 7: Pagination - page 1 with limit 2
  const page1Result =
    await api.functional.erpHrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: { page: 1, limit: 2 } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.equals("page 1 records", page1Result.pagination.records, 3);
  TestValidator.equals("page 1 pages", page1Result.pagination.pages, 2);
  TestValidator.equals("page 1 data length", page1Result.data.length, 2);
  // Test 8: Pagination - page 2 with limit 2
  const page2Result =
    await api.functional.erpHrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: { page: 2, limit: 2 } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 data length", page2Result.data.length, 1);
  // Test 9: Verify sorting by start_date descending
  const sortedResult =
    await api.functional.erpHrm.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {} satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorted descending by start_date",
    sortedResult.data[0].startDate >= sortedResult.data[1].startDate &&
      sortedResult.data[1].startDate >= sortedResult.data[2].startDate,
  );
}
