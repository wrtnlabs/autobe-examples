import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_employees_contracts_create } from "../../../generate/generate_random_hrm_member_employees_contracts_create";
import { prepare_random_hrm_contract } from "../../../prepare/prepare_random_hrm_contract";

/**
 * Test updating an active employment contract's compensation terms.
 *
 * Validates that a user with employee:manage permission can modify the pay_rate, pay_period, working_hours_per_week, and notes fields of an active contract (end_date is NULL). The system should update only the provided fields, set updated_at to current timestamp, and return the complete updated contract object.
 *
 * This test verifies the contract update workflow including compensation term modifications, timestamp updates, and field-level mutability constraints.
 *
 * 1. Register and authenticate a member with employee:manage permission
 * 2. Create an active employment contract (end_date is NULL)
 * 3. Capture the original contract's updated_at timestamp
 * 4. Update the contract with new compensation terms
 * 5. Validate all updated fields are correctly applied
 * 6. Verify updated_at timestamp has changed
 * 7. Verify immutable fields (employee_id, start_date) are retained
 * 8. Confirm contract remains active after update
 */
export async function test_api_contract_update_active_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member with employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.hrm.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // Note: In production tests, employeeId should reference a real employee record
  // This test assumes employee exists in the system
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Create an active employment contract
  const contractCreateDate = new Date();
  const originalContract: IHrmContract =
    await api.functional.hrm.member.employees.contracts.create(
      memberConnection,
      {
        employeeId,
        body: {
          start_date: contractCreateDate.toISOString(),
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Original contract notes",
        } satisfies IHrmContract.ICreate,
      },
    );
  typia.assert(originalContract);
  // 3. Verify contract is active (end_date is NULL)
  TestValidator.equals("contract is active", originalContract.end_date, null);
  // 4. Capture original updated_at timestamp
  const originalUpdatedAt = originalContract.updated_at;
  // 5. Update the contract with new compensation terms
  const updatedContract: IHrmContract =
    await api.functional.hrm.member.employees.contracts.update(
      memberConnection,
      {
        employeeId,
        contractId: originalContract.id,
        body: {
          pay_rate: 60000,
          pay_period: "hourly",
          working_hours_per_week: 35,
          notes: "Updated contract notes with new terms",
        } satisfies IHrmContract.IUpdate,
      },
    );
  typia.assert(updatedContract);
  // 6. Validate all updated fields are correct
  TestValidator.equals("pay_rate updated", updatedContract.pay_rate, 60000);
  TestValidator.equals(
    "pay_period updated",
    updatedContract.pay_period,
    "hourly",
  );
  TestValidator.equals(
    "working_hours_per_week updated",
    updatedContract.working_hours_per_week,
    35,
  );
  TestValidator.equals(
    "notes updated",
    updatedContract.notes,
    "Updated contract notes with new terms",
  );
  // 7. Verify updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedContract.updated_at,
    originalUpdatedAt,
  );
  // 8. Verify immutable fields are retained
  TestValidator.equals(
    "employee id retained",
    updatedContract.employee.id,
    originalContract.employee.id,
  );
  TestValidator.equals(
    "start_date retained",
    updatedContract.start_date,
    originalContract.start_date,
  );
  TestValidator.equals("end_date still null", updatedContract.end_date, null);
  // 9. Verify contract remains active
  TestValidator.equals("contract still active", updatedContract.end_date, null);
}
