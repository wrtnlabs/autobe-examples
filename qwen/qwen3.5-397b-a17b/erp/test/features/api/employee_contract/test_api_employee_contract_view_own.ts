import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";

export async function test_api_employee_contract_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create employee record for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: authorized.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 3. Create employment contract for the employee (ongoing contract - no end_date)
  const ongoingContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: new Date().toISOString(),
          end_date: null,
          pay_rate: typia.random<number>() + 1000,
          pay_period: RandomGenerator.pick([
            "hourly",
            "daily",
            "weekly",
            "monthly",
          ] as const),
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<60>
          >(),
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(ongoingContract);
  // 4. Retrieve the ongoing contract using the employee's own credentials
  const retrievedOngoingContract =
    await api.functional.hrmPlatform.member.employees.contracts.at(
      memberConnection,
      {
        employeeId: employee.id,
        contractId: ongoingContract.id,
      },
    );
  typia.assert(retrievedOngoingContract);
  // 5. Validate ongoing contract fields
  TestValidator.equals(
    "contract id matches",
    retrievedOngoingContract.id,
    ongoingContract.id,
  );
  TestValidator.equals(
    "employee id matches",
    retrievedOngoingContract.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "start date matches",
    retrievedOngoingContract.start_date,
    ongoingContract.start_date,
  );
  TestValidator.equals(
    "end date is null",
    retrievedOngoingContract.end_date,
    null,
  );
  TestValidator.equals(
    "pay rate matches",
    retrievedOngoingContract.pay_rate,
    ongoingContract.pay_rate,
  );
  TestValidator.equals(
    "pay period matches",
    retrievedOngoingContract.pay_period,
    ongoingContract.pay_period,
  );
  TestValidator.equals(
    "working hours matches",
    retrievedOngoingContract.working_hours_per_week,
    ongoingContract.working_hours_per_week,
  );
  TestValidator.equals(
    "employee display name",
    retrievedOngoingContract.employee.display_name,
    employee.display_name,
  );
  TestValidator.equals(
    "employee employment type",
    retrievedOngoingContract.employee.employment_type,
    employee.employment_type,
  );
  TestValidator.equals(
    "employee status",
    retrievedOngoingContract.employee.status,
    employee.status,
  );
  // 6. Create a second contract with end_date to test ended contract scenario
  const futureEndDate = new Date();
  futureEndDate.setFullYear(futureEndDate.getFullYear() + 1);
  const endedContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: new Date().toISOString(),
          end_date: futureEndDate.toISOString(),
          pay_rate: typia.random<number>() + 1000,
          pay_period: RandomGenerator.pick([
            "hourly",
            "daily",
            "weekly",
            "monthly",
          ] as const),
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<60>
          >(),
          notes: null,
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(endedContract);
  // 7. Retrieve the ended contract using the employee's own credentials
  const retrievedEndedContract =
    await api.functional.hrmPlatform.member.employees.contracts.at(
      memberConnection,
      {
        employeeId: employee.id,
        contractId: endedContract.id,
      },
    );
  typia.assert(retrievedEndedContract);
  // 8. Validate ended contract fields
  TestValidator.equals(
    "ended contract id matches",
    retrievedEndedContract.id,
    endedContract.id,
  );
  TestValidator.equals(
    "ended contract employee id",
    retrievedEndedContract.employee.id,
    employee.id,
  );
  TestValidator.predicate(
    "ended contract has end date",
    retrievedEndedContract.end_date !== null,
  );
  TestValidator.equals(
    "ended contract pay rate",
    retrievedEndedContract.pay_rate,
    endedContract.pay_rate,
  );
  TestValidator.equals(
    "ended contract pay period",
    retrievedEndedContract.pay_period,
    endedContract.pay_period,
  );
  TestValidator.equals(
    "ended contract working hours",
    retrievedEndedContract.working_hours_per_week,
    endedContract.working_hours_per_week,
  );
  TestValidator.equals(
    "ended contract employee display name",
    retrievedEndedContract.employee.display_name,
    employee.display_name,
  );
}
