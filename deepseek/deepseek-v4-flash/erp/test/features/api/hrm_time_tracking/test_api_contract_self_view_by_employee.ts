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

/**
 * Test that an employee can successfully view their own active employment contract.
 *
 * Validates the self-view authorization path where an authenticated member creates an organization, automatically becomes its owner employee, creates a contract for themselves, and then retrieves it. Verifies that all compensation details are correctly preserved and that the contract references the authenticated member.
 *
 * 1. Register a new member with randomized credentials.
 * 2. Create an organization — the authenticated member becomes the owner employee automatically.
 * 3. Re-authenticate to obtain the updated employee record reflecting the organizational membership.
 * 4. Create an employment contract for the owner employee with randomized compensation terms.
 * 5. Retrieve the contract by its ID.
 * 6. Validate the contract details match the submitted values and the employee references the correct member.
 */
export async function test_api_contract_self_view_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const displayName: string = RandomGenerator.name();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create an organization — member becomes owner employee automatically
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-authenticate to get updated employee list
  const loginConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(refreshed);
  const employeeId: string = refreshed.employees[0].id;
  // 4. Create an employment contract for the owner employee
  const contract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      loginConnection,
      {
        params: { employeeId },
      },
    );
  typia.assert(contract);
  // 5. Retrieve the contract by its ID
  const retrieved = await api.functional.hrmTimeTracking.employees.contracts.at(
    loginConnection,
    {
      employeeId,
      contractId: contract.id,
    },
  );
  typia.assert(retrieved);
  // 6. Validate contract details
  TestValidator.equals(
    "employee id matches path",
    retrieved.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "pay rate matches",
    retrieved.pay_rate,
    contract.pay_rate,
  );
  TestValidator.equals(
    "pay period matches",
    retrieved.pay_period,
    contract.pay_period,
  );
  TestValidator.equals(
    "working hours per week matches",
    retrieved.working_hours_per_week,
    contract.working_hours_per_week,
  );
  TestValidator.equals(
    "end date is null for active contract",
    retrieved.end_date,
    null,
  );
  TestValidator.equals(
    "member display name matches",
    retrieved.employee.member.display_name,
    displayName,
  );
}
