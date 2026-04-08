import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_contracts_create } from "../../../generate/generate_random_hrm_time_track_member_employees_contracts_create";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_employee_contract } from "../../../prepare/prepare_random_hrm_time_track_employee_contract";

/**
 * Test employee contract listing with various filter combinations.
 *
 * Validates the employee contract filtering functionality including date range filters, status filters, pay period filters, and sorting capabilities. The test creates multiple contracts with different attributes and verifies that each filter correctly narrows down the results.
 *
 * Special attention is given to testing combined filters and ensuring pagination works correctly with filtered datasets.
 *
 * 1. Authenticate member and create an employee record.
 * 2. Create multiple contracts with varying dates, pay periods, and statuses.
 * 3. Test startDateFrom/startDateTo range filtering.
 * 4. Test status filter for active and ended contracts.
 * 5. Test payPeriod filter with different values.
 * 6. Test combined filters working together.
 * 7. Test sorting with sort and orderBy parameters.
 * 8. Verify pagination metadata accuracy.
 */
export async function test_api_employee_contract_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create employee
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Create multiple contracts with different attributes
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Contract 1: Active hourly contract
  const contract1 =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: yesterday.toISOString(),
          end_date: null,
          pay_rate: 25,
          pay_period: "hourly",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(contract1);
  // Contract 2: Ended daily contract
  const contract2 =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: new Date(
            now.getTime() - 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: yesterday.toISOString(),
          pay_rate: 200,
          pay_period: "daily",
          working_hours_per_week: 30,
        },
      },
    );
  typia.assert(contract2);
  // Contract 3: Active weekly contract
  const contract3 =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: tomorrow.toISOString(),
          end_date: null,
          pay_rate: 1000,
          pay_period: "weekly",
          working_hours_per_week: 35,
        },
      },
    );
  typia.assert(contract3);
  // Contract 4: Active monthly contract
  const contract4 =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: nextWeek.toISOString(),
          end_date: null,
          pay_rate: 4000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(contract4);
  // 4. Test startDateFrom/startDateTo range filtering
  const dateFiltered =
    await api.functional.hrmTimeTrack.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          startDateFrom: yesterday.toISOString(),
          startDateTo: tomorrow.toISOString(),
        },
      },
    );
  typia.assert(dateFiltered);
  TestValidator.equals(
    "date range filter returns correct count",
    dateFiltered.pagination.records,
    2,
  );
  // 5. Test status filter for active contracts
  const activeContracts =
    await api.functional.hrmTimeTrack.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          status: "active",
        },
      },
    );
  typia.assert(activeContracts);
  TestValidator.equals(
    "active status filter returns correct count",
    activeContracts.pagination.records,
    3,
  );
  // 6. Test status filter for ended contracts
  const endedContracts =
    await api.functional.hrmTimeTrack.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          status: "ended",
        },
      },
    );
  typia.assert(endedContracts);
  TestValidator.equals(
    "ended status filter returns correct count",
    endedContracts.pagination.records,
    1,
  );
  // 7. Test payPeriod filter
  const hourlyContracts =
    await api.functional.hrmTimeTrack.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          payPeriod: "hourly",
        },
      },
    );
  typia.assert(hourlyContracts);
  TestValidator.equals(
    "hourly payPeriod filter returns correct count",
    hourlyContracts.pagination.records,
    1,
  );
  // 8. Test combined filters (active + hourly)
  const activeHourly =
    await api.functional.hrmTimeTrack.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          status: "active",
          payPeriod: "hourly",
        },
      },
    );
  typia.assert(activeHourly);
  TestValidator.equals(
    "combined active and hourly filters return correct count",
    activeHourly.pagination.records,
    1,
  );
  // 9. Test sorting
  const sortedContracts =
    await api.functional.hrmTimeTrack.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          sort: "pay_rate",
          orderBy: "asc",
        },
      },
    );
  typia.assert(sortedContracts);
  TestValidator.predicate("contracts sorted by pay_rate ascending", () => {
    for (let i = 1; i < sortedContracts.data.length; i++) {
      if (
        sortedContracts.data[i - 1].pay_rate > sortedContracts.data[i].pay_rate
      ) {
        return false;
      }
    }
    return true;
  });
  // 10. Test pagination with filtered results
  const paginated =
    await api.functional.hrmTimeTrack.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          status: "active",
          page: 1,
          pageSize: 2,
        },
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination limit is correct",
    paginated.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page is correct",
    paginated.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records is correct",
    paginated.pagination.records,
    3,
  );
  // 11. Test empty results when filters don't match
  const emptyResult =
    await api.functional.hrmTimeTrack.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          startDateFrom: new Date("2099-01-01").toISOString(),
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "no matching contracts returns empty data",
    emptyResult.pagination.records,
    0,
  );
}
