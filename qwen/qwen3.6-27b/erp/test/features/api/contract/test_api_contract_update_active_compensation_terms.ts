import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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

/**
 * Test updating active employment contract compensation terms and working hours.
 *
 * Validates the full contract update workflow including member authentication as organization owner, employee record creation, active contract establishment, and subsequent modification of compensation terms. Ensures that mutable fields such as pay rate, pay period, working hours, and notes are correctly updated while immutable fields including contract identifier, start date, end date, and employee reference remain preserved.
 *
 * Special attention is given to verifying the active contract state business rule where contracts with null end_date can be modified, and confirming that the update operation refreshes the timestamps appropriately.
 *
 * 1. Owner member joins the platform and creates an organization.
 * 2. Second member joins the platform as a separate account.
 * 3. Owner creates employee record for second member.
 * 4. Owner creates an active employment contract for the employee.
 * 5. Owner updates the contract with new compensation terms.
 * 6. Validates mutable fields are updated and immutable fields preserved.
 */
export async function test_api_contract_update_active_compensation_terms(
  connection: api.IConnection,
) {
  // 1. Authenticate as Owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Authenticate as second member (employee)
  const employeeMemberEmail = typia.random<string & tags.Format<"email">>();
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeMemberConnection, {
    body: {
      email: employeeMemberEmail,
      password: "1234",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employeeMember);
  // 3. Create employee record for second member
  const employee = await generate_random_hrm_platform_member_employees_create(
    ownerConnection,
    {
      body: {
        memberId: employeeMember.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create active employment contract
  const initialPayRate = typia.random<number & tags.Minimum<1>>();
  const initialPayPeriod: "hourly" | "daily" | "weekly" | "monthly" =
    RandomGenerator.pick(["hourly", "daily", "weekly", "monthly"]);
  const initialWorkingHours: number & tags.Type<"int32"> = 40;
  const contract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      ownerConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          pay_rate: initialPayRate,
          pay_period: initialPayPeriod,
          working_hours_per_week: initialWorkingHours,
        },
      },
    );
  typia.assert(contract);
  // Capture immutable fields
  const originalId = contract.id;
  const originalStart = contract.start_date;
  const originalEnd = contract.end_date;
  const originalCreatedAt = contract.created_at;
  // 5. Update contract with new compensation terms
  const newPayRate = typia.random<number & tags.Minimum<1>>();
  const newPayPeriod: "hourly" | "daily" | "weekly" | "monthly" =
    typia.assert<"hourly" | "daily" | "weekly" | "monthly">(
      RandomGenerator.pick(
        ["hourly", "daily", "weekly", "monthly"].filter(
          (p) => p !== initialPayPeriod,
        ),
      ),
    );
  const newWorkingHours: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const newNotes = RandomGenerator.paragraph({ sentences: 2 });
  const updateBody = {
    payRate: newPayRate,
    payPeriod: newPayPeriod,
    workingHoursPerWeek: newWorkingHours,
    notes: newNotes,
  } satisfies IHrmPlatformEmployeeContract.IUpdate;
  const updatedContract =
    await api.functional.hrmPlatform.member.employees.contracts.update(
      ownerConnection,
      {
        employeeId: employee.id,
        contractId: contract.id,
        body: updateBody,
      },
    );
  typia.assert(updatedContract);
  // 6. Validate response - mutable fields updated
  TestValidator.equals(
    "pay_rate updated",
    updatedContract.pay_rate,
    newPayRate,
  );
  TestValidator.equals(
    "pay_period updated",
    updatedContract.pay_period,
    newPayPeriod,
  );
  TestValidator.equals(
    "working_hours_per_week updated",
    updatedContract.working_hours_per_week,
    newWorkingHours,
  );
  TestValidator.equals("notes updated", updatedContract.notes, newNotes);
  // Immutable fields preserved
  TestValidator.equals("id unchanged", updatedContract.id, originalId);
  TestValidator.equals(
    "start_date unchanged",
    updatedContract.start_date,
    originalStart,
  );
  TestValidator.equals(
    "end_date unchanged",
    updatedContract.end_date,
    originalEnd,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedContract.created_at,
    originalCreatedAt,
  );
  // Employee reference preserved
  TestValidator.equals(
    "employee reference preserved",
    updatedContract.employee.id,
    employee.id,
  );
  // Timestamps refreshed
  TestValidator.predicate(
    "updated_at differs from created_at",
    updatedContract.updated_at !== originalCreatedAt,
  );
}
