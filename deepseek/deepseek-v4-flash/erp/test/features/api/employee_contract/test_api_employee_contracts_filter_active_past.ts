import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_employees_contracts_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_contracts_filter_active_past(
  connection: api.IConnection,
): Promise<void> {
  // ---- Preconditions ----
  // 1. Register a new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorized);
  // 2. Create an organization — auto-creates employee record for the member
  const org =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(org);
  // 3. Re-login to get fresh member data with populated employee records
  const freshAuthorized = await authorize_member_login(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(freshAuthorized);
  const employeeId = freshAuthorized.employees[0].id;
  // 4. Prepare date references for contracts
  const today = new Date();
  const startDateA = new Date(
    Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      9,
      0,
      0,
      0,
    ),
  ).toISOString();
  const startDateB = new Date(
    Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
      9,
      0,
      0,
      0,
    ),
  ).toISOString();
  const startDateC = new Date(
    Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 2,
      9,
      0,
      0,
      0,
    ),
  ).toISOString();
  // 5. Create CONTRACT_A — active (no endDate)
  const contractA =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          startDate: startDateA,
          endDate: undefined,
          payRate: 50000,
          payPeriod: "monthly" as const,
          workingHoursPerWeek: 40,
        },
      },
    );
  typia.assert(contractA);
  // CONTRACT_A is active, end_date should be null
  TestValidator.equals(
    "contract A end_date is null after creation",
    contractA.end_date,
    null,
  );
  // 6. Create CONTRACT_B — system auto-ends CONTRACT_A
  const contractB =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          startDate: startDateB,
          endDate: undefined,
          payRate: 55000,
          payPeriod: "monthly" as const,
          workingHoursPerWeek: 40,
        },
      },
    );
  typia.assert(contractB);
  // CONTRACT_B is now active, CONTRACT_A is now past (end_date set)
  // 7. Create CONTRACT_C — system auto-ends CONTRACT_B
  const contractC =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          startDate: startDateC,
          endDate: undefined,
          payRate: 60000,
          payPeriod: "monthly" as const,
          workingHoursPerWeek: 40,
        },
      },
    );
  typia.assert(contractC);
  // CONTRACT_C is now active, CONTRACT_B is now past
  // ---- Test: Filter by status='active' ----
  // Should return only CONTRACT_C (the current active one)
  const activePage =
    await api.functional.hrmTimeTracking.employees.contracts.index(
      memberConnection,
      {
        employeeId,
        body: { status: "active" as const },
      },
    );
  typia.assert(activePage);
  TestValidator.equals(
    "active filter returns exactly 1 contract",
    activePage.data.length,
    1,
  );
  TestValidator.equals(
    "active contract is CONTRACT_C",
    activePage.data[0].id,
    contractC.id,
  );
  TestValidator.equals(
    "active contract has end_date = null",
    activePage.data[0].end_date,
    null,
  );
  // ---- Test: Filter by status='past' ----
  // Should return CONTRACT_A and CONTRACT_B (both have non-null end_date)
  const pastPage =
    await api.functional.hrmTimeTracking.employees.contracts.index(
      memberConnection,
      {
        employeeId,
        body: { status: "past" as const },
      },
    );
  typia.assert(pastPage);
  TestValidator.equals(
    "past filter returns exactly 2 contracts",
    pastPage.data.length,
    2,
  );
  // Both past contracts must have non-null end_date
  for (const contract of pastPage.data) {
    TestValidator.predicate(
      `past contract ${contract.id} has end_date set`,
      contract.end_date !== null,
    );
  }
  // ---- Test: No filter ----
  // Should return all 3 contracts ordered by start_date descending
  const allPage =
    await api.functional.hrmTimeTracking.employees.contracts.index(
      memberConnection,
      {
        employeeId,
        body: {},
      },
    );
  typia.assert(allPage);
  TestValidator.equals(
    "no filter returns all 3 contracts",
    allPage.data.length,
    3,
  );
  // Ordered by start_date descending: C, B, A
  TestValidator.equals(
    "first contract is CONTRACT_C",
    allPage.data[0].id,
    contractC.id,
  );
  TestValidator.equals(
    "second contract is CONTRACT_B",
    allPage.data[1].id,
    contractB.id,
  );
  TestValidator.equals(
    "third contract is CONTRACT_A",
    allPage.data[2].id,
    contractA.id,
  );
}
