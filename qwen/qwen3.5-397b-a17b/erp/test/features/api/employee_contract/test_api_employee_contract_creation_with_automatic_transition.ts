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
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";

export async function test_api_employee_contract_creation_with_automatic_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with employee management access
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate employee ID for contract creation
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create first contract with specific start date (tomorrow)
  const firstStartDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const firstContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          start_date: firstStartDate.toISOString(),
          end_date: null,
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          pay_period: "monthly",
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<60>
          >(),
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  // 4. Verify first contract is active (end_date is null)
  TestValidator.predicate(
    "first contract is active",
    firstContract.end_date === null,
  );
  TestValidator.equals(
    "first contract employee matches",
    firstContract.employee.id,
    employeeId,
  );
  TestValidator.predicate(
    "first contract has valid pay_rate",
    firstContract.pay_rate > 0,
  );
  TestValidator.equals(
    "first contract pay_period",
    firstContract.pay_period,
    "monthly",
  );
  TestValidator.predicate(
    "first contract has valid working hours",
    firstContract.working_hours_per_week > 0,
  );
  // 5. Create second contract with later start date to trigger automatic transition
  const secondStartDate = new Date(
    firstStartDate.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  const secondContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          start_date: secondStartDate.toISOString(),
          end_date: null,
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<2000>
          >(),
          pay_period: "hourly",
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<40>
          >(),
          notes: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(secondContract);
  // 6. Verify second contract is active (end_date is null)
  TestValidator.predicate(
    "second contract is active",
    secondContract.end_date === null,
  );
  TestValidator.equals(
    "second contract employee matches",
    secondContract.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "second contract pay_period",
    secondContract.pay_period,
    "hourly",
  );
  TestValidator.predicate(
    "second contract has different pay_rate",
    secondContract.pay_rate !== firstContract.pay_rate,
  );
  // 7. Test business rule validations for different pay_period values
  const dailyContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          start_date: new Date().toISOString(),
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
          pay_period: "daily",
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(dailyContract);
  TestValidator.equals(
    "pay_period daily accepted",
    dailyContract.pay_period,
    "daily",
  );
  const weeklyContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          start_date: new Date().toISOString(),
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
          pay_period: "weekly",
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(weeklyContract);
  TestValidator.equals(
    "pay_period weekly accepted",
    weeklyContract.pay_period,
    "weekly",
  );
  // 8. Verify contract includes complete employee relation data
  TestValidator.predicate(
    "contract has employee user data",
    firstContract.employee.user !== undefined,
  );
  TestValidator.predicate(
    "contract has employee role data",
    firstContract.employee.role !== undefined,
  );
  TestValidator.predicate(
    "employee has display name",
    firstContract.employee.user.display_name.length > 0,
  );
  TestValidator.predicate(
    "role has name",
    firstContract.employee.role.name.length > 0,
  );
  TestValidator.predicate(
    "role has organization",
    firstContract.employee.role.organization !== undefined,
  );
  // 9. Verify timestamps are valid date-time format
  TestValidator.predicate(
    "created_at is valid date",
    new Date(firstContract.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(firstContract.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "start_date is valid date",
    new Date(firstContract.start_date).getTime() > 0,
  );
  // 10. Verify optional fields handling
  TestValidator.predicate(
    "notes field preserved",
    firstContract.notes !== undefined,
  );
  TestValidator.predicate(
    "end_date can be null for ongoing contract",
    secondContract.end_date === null,
  );
}
