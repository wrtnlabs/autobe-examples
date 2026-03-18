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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_contracts_create";
import { generate_random_hrm_time_tracking_member_employees_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_create";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";

export async function test_api_employee_contract_replace_active_contract(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: typia.random<string & tags.Format<"uuid">>(),
          roleId: typia.random<string & tags.Format<"uuid">>(),
          departmentId: null,
          positionTitle: RandomGenerator.name(),
          employmentType: "contractor",
          status: "active",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  const now = new Date();
  const firstStartDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const secondStartDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 1,
  ).toISOString();
  const firstEndDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 2,
  ).toISOString();
  const firstContract =
    await generate_random_hrm_time_tracking_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          startDate: firstStartDate,
          endDate: firstEndDate,
          payRate: 30000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Initial contract",
        } satisfies IHrmTimeTrackingEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  const secondContract =
    await generate_random_hrm_time_tracking_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          startDate: secondStartDate,
          endDate: null,
          payRate: 35000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Replacement contract",
        } satisfies IHrmTimeTrackingEmployeeContract.ICreate,
      },
    );
  typia.assert(secondContract);
  TestValidator.equals(
    "employee id should remain consistent",
    secondContract.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "first contract employee should remain consistent",
    firstContract.employee.id,
    employee.id,
  );
  TestValidator.notEquals(
    "replacement contract id should differ from original",
    firstContract.id,
    secondContract.id,
  );
  TestValidator.predicate(
    "second contract should be the active replacement",
    secondContract.endDate === null,
  );
  TestValidator.predicate(
    "first contract should remain historical with an end date",
    firstContract.endDate !== null,
  );
  TestValidator.predicate(
    "replacement contract should start no earlier than the original contract",
    new Date(secondContract.startDate).getTime() >=
      new Date(firstContract.startDate).getTime(),
  );
  TestValidator.predicate(
    "historical contract should end before or at the replacement start",
    firstContract.endDate !== null &&
      new Date(firstContract.endDate).getTime() <=
        new Date(secondContract.startDate).getTime(),
  );
}
