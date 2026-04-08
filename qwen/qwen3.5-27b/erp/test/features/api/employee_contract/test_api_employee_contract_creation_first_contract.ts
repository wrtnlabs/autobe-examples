import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
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
 * Test the primary success path for creating an employee's first employment contract.
 *
 * Validates the complete employee contract creation flow including member authentication, employee record creation, and contract establishment. Ensures that the contract is created with all required compensation terms, working hours, and contract period details.
 *
 * Special attention is given to verifying that the contract is created as an ongoing contract (no end_date), all contract fields are properly populated, and the employee relationship is correctly established in the response.
 *
 * 1. Authenticate as a member with employee management permissions.
 * 2. Create an employee record in the organization.
 * 3. Create a contract for the employee with future start_date, positive pay_rate, valid pay_period, and working_hours_per_week.
 * 4. Validate the contract response contains all expected fields with correct values.
 * 5. Verify the contract has no end_date (ongoing contract status).
 * 6. Verify the employee summary is correctly included in the contract response.
 */
export async function test_api_employee_contract_creation_first_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create an employee record
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Prepare contract creation data
  const contractStartDate = new Date(
    new Date().getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const contractPayRate = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const contractPayPeriod = RandomGenerator.pick([
    "hourly",
    "daily",
    "weekly",
    "monthly",
  ] as const);
  const contractWorkingHours = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<60>
  >();
  const contractNotes = RandomGenerator.paragraph({ sentences: 2 });
  // 4. Create a contract for the employee
  const contract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          start_date: contractStartDate,
          pay_rate: contractPayRate,
          pay_period: contractPayPeriod,
          working_hours_per_week: contractWorkingHours,
          notes: contractNotes,
        } satisfies IHrmTimeTrackEmployeeContract.ICreate,
      },
    );
  typia.assert(contract);
  // 5. Validate contract fields match input
  TestValidator.equals(
    "start_date matches input",
    contract.start_date,
    contractStartDate,
  );
  TestValidator.equals(
    "pay_rate matches input",
    contract.pay_rate,
    contractPayRate,
  );
  TestValidator.equals(
    "pay_period matches input",
    contract.pay_period,
    contractPayPeriod,
  );
  TestValidator.equals(
    "working_hours_per_week matches input",
    contract.working_hours_per_week,
    contractWorkingHours,
  );
  TestValidator.equals("notes match input", contract.notes, contractNotes);
  // 6. Verify contract has no end_date (ongoing contract)
  TestValidator.equals(
    "end_date is null for ongoing contract",
    contract.end_date,
    null,
  );
  // 7. Verify employee relationship
  TestValidator.equals(
    "employee_id matches",
    contract.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "employee position is present",
    contract.employee.position.length > 0,
    true,
  );
  TestValidator.equals(
    "employee employment_type is valid",
    ["full-time", "part-time", "contractor", "intern"].includes(
      contract.employee.employment_type,
    ),
    true,
  );
  TestValidator.equals(
    "employee status is valid",
    ["active", "deactivated"].includes(contract.employee.status),
    true,
  );
  // 8. Verify timestamps exist
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(contract.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(contract.updated_at)),
  );
}
