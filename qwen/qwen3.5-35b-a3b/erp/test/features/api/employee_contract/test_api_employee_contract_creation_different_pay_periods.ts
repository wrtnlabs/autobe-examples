import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_employees_contracts_create } from "../../../generate/generate_random_hrms_member_employees_contracts_create";
import { prepare_random_hrms_employee_contract } from "../../../prepare/prepare_random_hrms_employee_contract";

export async function test_api_employee_contract_creation_different_pay_periods(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: "http://test.com/signup",
        referrer: "http://test.com",
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create new connection with the member token (utilizes memberConnection which is updated internally)
  const memberAuthConnection: api.IConnection = { host: connection.host };
  // 3. Generate a random employee ID for testing
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create contracts with different pay periods
  const contracts: IHrmsEmployeeContract[] = [];
  // Test hourly pay period
  const hourlyBody = {
    start_date: new Date().toISOString(),
    pay_rate: typia.random<number & tags.Type<"uint32">>(),
    pay_period: "hourly" as const,
    working_hours_per_week: 40 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    notes: "Hourly pay period contract",
  } satisfies IHrmsEmployeeContract.ICreate;
  const hourlyContract =
    await api.functional.hrms.member.employees.contracts.create(
      memberAuthConnection,
      {
        employeeId,
        body: hourlyBody,
      },
    );
  typia.assert(hourlyContract);
  contracts.push(hourlyContract);
  // Test daily pay period
  const dailyBody = {
    start_date: new Date().toISOString(),
    pay_rate: typia.random<number & tags.Type<"uint32">>(),
    pay_period: "daily" as const,
    working_hours_per_week: 8 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    notes: "Daily pay period contract",
  } satisfies IHrmsEmployeeContract.ICreate;
  const dailyContract =
    await api.functional.hrms.member.employees.contracts.create(
      memberAuthConnection,
      {
        employeeId,
        body: dailyBody,
      },
    );
  typia.assert(dailyContract);
  contracts.push(dailyContract);
  // Test weekly pay period
  const weeklyBody = {
    start_date: new Date().toISOString(),
    pay_rate: typia.random<number & tags.Type<"uint32">>(),
    pay_period: "weekly" as const,
    working_hours_per_week: 40 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    notes: "Weekly pay period contract",
  } satisfies IHrmsEmployeeContract.ICreate;
  const weeklyContract =
    await api.functional.hrms.member.employees.contracts.create(
      memberAuthConnection,
      {
        employeeId,
        body: weeklyBody,
      },
    );
  typia.assert(weeklyContract);
  contracts.push(weeklyContract);
  // Test monthly pay period (typically 160 hours per month, normalized to weekly)
  const monthlyBody = {
    start_date: new Date().toISOString(),
    pay_rate: typia.random<number & tags.Type<"uint32">>(),
    pay_period: "monthly" as const,
    working_hours_per_week: 160 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    notes: "Monthly pay period contract",
  } satisfies IHrmsEmployeeContract.ICreate;
  const monthlyContract =
    await api.functional.hrms.member.employees.contracts.create(
      memberAuthConnection,
      {
        employeeId,
        body: monthlyBody,
      },
    );
  typia.assert(monthlyContract);
  // 5. Validate all contracts have correct pay_period values
  TestValidator.equals(
    "hourly contract pay_period",
    hourlyContract.payPeriod,
    "hourly",
  );
  TestValidator.equals(
    "daily contract pay_period",
    dailyContract.payPeriod,
    "daily",
  );
  TestValidator.equals(
    "weekly contract pay_period",
    weeklyContract.payPeriod,
    "weekly",
  );
  TestValidator.equals(
    "monthly contract pay_period",
    monthlyContract.payPeriod,
    "monthly",
  );
  // 6. Validate all contracts belong to same employee
  TestValidator.equals(
    "all contracts same employee",
    hourlyContract.hrmsEmployeeId,
    dailyContract.hrmsEmployeeId,
  );
  TestValidator.equals(
    "all contracts same employee",
    hourlyContract.hrmsEmployeeId,
    weeklyContract.hrmsEmployeeId,
  );
  TestValidator.equals(
    "all contracts same employee",
    hourlyContract.hrmsEmployeeId,
    monthlyContract.hrmsEmployeeId,
  );
  // 7. Validate all contracts have unique IDs
  TestValidator.notEquals(
    "hourly and daily contracts have unique IDs",
    hourlyContract.id,
    dailyContract.id,
  );
  TestValidator.notEquals(
    "daily and weekly contracts have unique IDs",
    dailyContract.id,
    weeklyContract.id,
  );
  TestValidator.notEquals(
    "weekly and monthly contracts have unique IDs",
    weeklyContract.id,
    monthlyContract.id,
  );
  // 8. Validate working hours are stored correctly
  TestValidator.equals(
    "hourly contract working hours",
    hourlyContract.workingHoursPerWeek,
    40,
  );
  TestValidator.equals(
    "daily contract working hours",
    dailyContract.workingHoursPerWeek,
    8,
  );
  TestValidator.equals(
    "weekly contract working hours",
    weeklyContract.workingHoursPerWeek,
    40,
  );
  TestValidator.equals(
    "monthly contract working hours",
    monthlyContract.workingHoursPerWeek,
    160,
  );
  // 9. Validate all contracts have notes
  TestValidator.equals(
    "hourly contract has notes",
    hourlyContract.notes,
    "Hourly pay period contract",
  );
  TestValidator.equals(
    "daily contract has notes",
    dailyContract.notes,
    "Daily pay period contract",
  );
  TestValidator.equals(
    "weekly contract has notes",
    weeklyContract.notes,
    "Weekly pay period contract",
  );
  TestValidator.equals(
    "monthly contract has notes",
    monthlyContract.notes,
    "Monthly pay period contract",
  );
  // 10. Validate that pay rate is positive for all contracts
  TestValidator.predicate(
    "hourly contract pay rate is positive",
    hourlyContract.payRate > 0,
  );
  TestValidator.predicate(
    "daily contract pay rate is positive",
    dailyContract.payRate > 0,
  );
  TestValidator.predicate(
    "weekly contract pay rate is positive",
    weeklyContract.payRate > 0,
  );
  TestValidator.predicate(
    "monthly contract pay rate is positive",
    monthlyContract.payRate > 0,
  );
  // 11. Validate all contracts have valid timestamps
  TestValidator.predicate(
    "hourly contract has created timestamp",
    hourlyContract.createdAt !== undefined,
  );
  TestValidator.predicate(
    "daily contract has created timestamp",
    dailyContract.createdAt !== undefined,
  );
  TestValidator.predicate(
    "weekly contract has created timestamp",
    weeklyContract.createdAt !== undefined,
  );
  TestValidator.predicate(
    "monthly contract has created timestamp",
    monthlyContract.createdAt !== undefined,
  );
}
