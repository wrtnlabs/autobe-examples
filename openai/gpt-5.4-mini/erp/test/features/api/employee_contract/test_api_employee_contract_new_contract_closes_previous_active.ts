import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
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
import { generate_random_hrm_time_tracking_member_employees_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_create";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";

export async function test_api_employee_contract_new_contract_closes_previous_active(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  memberConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: typia.random<string & tags.Format<"uuid">>(),
          roleId: typia.random<string & tags.Format<"uuid">>(),
          departmentId: null,
          positionTitle: RandomGenerator.name(),
          employmentType: "full-time",
          status: "active",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  const initialStartDate = new Date("2026-03-03T00:00:00.000Z").toISOString();
  const nextStartDate = new Date("2026-04-01T00:00:00.000Z").toISOString();
  const expectedPreviousEndDate = new Date(
    "2026-03-31T00:00:00.000Z",
  ).toISOString();
  const initialContractHistory =
    await api.functional.hrmTimeTracking.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          startDate: initialStartDate,
          payRate: 4200,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Initial active contract",
        } satisfies IHrmTimeTrackingEmployeeContract.IRequest,
      },
    );
  typia.assert(initialContractHistory);
  const initialActiveContract = initialContractHistory.data[0];
  TestValidator.equals(
    "initial contract start date should match",
    initialActiveContract.startDate,
    initialStartDate,
  );
  TestValidator.equals(
    "initial contract end date should be null",
    initialActiveContract.endDate,
    null,
  );
  TestValidator.equals(
    "initial contract pay rate should match",
    initialActiveContract.payRate,
    4200,
  );
  const updatedHistory =
    await api.functional.hrmTimeTracking.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          startDate: nextStartDate,
          payRate: 5100,
          payPeriod: "monthly",
          workingHoursPerWeek: 35,
          notes: "Updated active contract",
        } satisfies IHrmTimeTrackingEmployeeContract.IRequest,
      },
    );
  typia.assert(updatedHistory);
  TestValidator.predicate(
    "new contract history should contain at least two records",
    updatedHistory.data.length >= 2,
  );
  const [newActiveContract, previousContract] = updatedHistory.data;
  TestValidator.equals(
    "newest contract should be first",
    newActiveContract.startDate,
    nextStartDate,
  );
  TestValidator.equals(
    "new contract should remain active",
    newActiveContract.endDate,
    null,
  );
  TestValidator.equals(
    "new contract pay rate should be preserved exactly",
    newActiveContract.payRate,
    5100,
  );
  TestValidator.equals(
    "new contract pay period should be preserved exactly",
    newActiveContract.payPeriod,
    "monthly",
  );
  TestValidator.equals(
    "new contract weekly hours should be preserved exactly",
    newActiveContract.workingHoursPerWeek,
    35,
  );
  TestValidator.equals(
    "new contract notes should be preserved exactly",
    newActiveContract.notes,
    "Updated active contract",
  );
  TestValidator.equals(
    "previous contract should be the earlier start date",
    previousContract.startDate,
    initialStartDate,
  );
  TestValidator.equals(
    "previous contract should end the day before the new contract starts",
    previousContract.endDate,
    expectedPreviousEndDate,
  );
  TestValidator.equals(
    "previous contract pay rate should remain unchanged",
    previousContract.payRate,
    4200,
  );
  TestValidator.equals(
    "previous contract notes should remain unchanged",
    previousContract.notes,
    "Initial active contract",
  );
}
