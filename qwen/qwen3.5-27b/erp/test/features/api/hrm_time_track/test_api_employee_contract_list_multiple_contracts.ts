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
 * Test employee contract list retrieval with multiple contracts for pagination and sorting validation.
 *
 * Validates the complete employee contract listing workflow including member authentication, employee creation, multiple contract creation (both historical and active), and paginated list retrieval. Ensures that contracts are properly sorted by start_date in descending order, pagination metadata is accurate, and all contract fields are correctly populated with employee summaries.
 *
 * Special attention is given to verifying that one contract remains active (end_date is null) while historical contracts have end_date set, and that the employee summary includes all required organizational context information.
 *
 * 1. Member authenticates via join endpoint with random credentials.
 * 2. Employee record is created with random employment details.
 * 3. First contract is created as historical with a past end_date.
 * 4. Second contract is created as active with end_date as null.
 * 5. Contract list is retrieved with pagination parameters.
 * 6. Validates contract count, sorting order, pagination metadata, and data completeness.
 */
export async function test_api_employee_contract_list_multiple_contracts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create employee
  const employee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {},
    );
  typia.assert(employee);
  // 3. Create first contract (historical - will be ended by second contract creation)
  const firstContract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: new Date(
            new Date().getTime() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date(
            new Date().getTime() - 180 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          pay_rate: typia.random<number>(),
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Initial employment contract",
        } satisfies IHrmTimeTrackEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  // 4. Create second contract (active - will end first contract automatically)
  const secondContract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: new Date(
            new Date().getTime() - 179 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: null,
          pay_rate: typia.random<number>(),
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Renewed employment contract",
        } satisfies IHrmTimeTrackEmployeeContract.ICreate,
      },
    );
  typia.assert(secondContract);
  // 5. Retrieve contract list
  const contractsPage =
    await api.functional.hrmTimeTrack.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          page: 1,
          pageSize: 20,
          sort: "start_date",
          orderBy: "desc",
        } satisfies IHrmTimeTrackEmployeeContract.IRequest,
      },
    );
  typia.assert(contractsPage);
  // 6. Validate pagination metadata
  TestValidator.equals("contract count", contractsPage.pagination.records, 2);
  TestValidator.equals("current page", contractsPage.pagination.current, 1);
  TestValidator.equals("page limit", contractsPage.pagination.limit, 20);
  TestValidator.equals("total pages", contractsPage.pagination.pages, 1);
  // 7. Validate contract data array length
  TestValidator.equals("data array length", contractsPage.data.length, 2);
  // 8. Validate sorting (newest first by start_date)
  TestValidator.predicate(
    "contracts sorted by start_date descending",
    new Date(contractsPage.data[0].start_date).getTime() >=
      new Date(contractsPage.data[1].start_date).getTime(),
  );
  // 9. Validate active contract exists (end_date is null)
  const activeContract = contractsPage.data.find((c) => c.end_date === null);
  TestValidator.predicate("has active contract", activeContract !== undefined);
  // 10. Validate historical contract exists (end_date is set)
  const historicalContract = contractsPage.data.find(
    (c) => c.end_date !== null,
  );
  TestValidator.predicate(
    "has historical contract",
    historicalContract !== undefined,
  );
  // 11. Validate employee reference in contracts
  for (const contract of contractsPage.data) {
    TestValidator.equals(
      "employee id matches",
      contract.employee.id,
      employee.id,
    );
  }
  // 12. Validate pay_period values are valid
  for (const contract of contractsPage.data) {
    TestValidator.predicate(
      "pay_period is valid",
      ["hourly", "daily", "weekly", "monthly"].includes(contract.pay_period),
    );
  }
  // 13. Validate working hours are positive
  for (const contract of contractsPage.data) {
    TestValidator.predicate(
      "working_hours_per_week is positive",
      contract.working_hours_per_week > 0,
    );
  }
  // 14. Validate pay_rate is positive
  for (const contract of contractsPage.data) {
    TestValidator.predicate("pay_rate is positive", contract.pay_rate > 0);
  }
}