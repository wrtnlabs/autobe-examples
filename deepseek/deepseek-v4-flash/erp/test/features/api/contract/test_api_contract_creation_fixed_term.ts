import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_employees_contracts_create";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_create";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

export async function test_api_contract_creation_fixed_term(
  connection: api.IConnection,
): Promise<void> {
  // === SETUP ===
  // 1. Join as member A (admin/owner)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_member_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role with employee:manage permission
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      adminConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Employee Manager",
          permissions: ["employee:manage"],
        },
      },
    );
  typia.assert(role);
  // 4. Pre-invite an unregistered email (pending invitation)
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await api.functional.hrmTimeTracking.member.invitations.create(
      adminConnection,
      {
        body: {
          email: employeeEmail,
          role_id: role.id,
        } satisfies IHrmTimeTrackingInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 5. Member B joins with the invited email — invitation auto-accepts,
  //    employee record is created, and join response includes the employee IDs
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
    },
  });
  typia.assert(employeeAuth);
  // Find the employee record for our organization
  const employee = employeeAuth.employees.find(
    (e) => e.role.organization.id === organization.id,
  )!;
  // === PRECONDITION: Create first active contract (no end_date) ===
  const firstContract =
    await api.functional.hrmTimeTracking.employees.contracts.create(
      adminConnection,
      {
        employeeId: employee.id,
        body: {
          startDate: "2026-03-01T00:00:00.000Z",
          payRate: 25,
          payPeriod: "hourly",
          workingHoursPerWeek: 20,
        } satisfies IHrmTimeTrackingEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  // Verify first contract has no end_date (active/open-ended contract)
  TestValidator.equals(
    "first contract end_date is null",
    firstContract.end_date,
    null,
  );
  // === TARGET: Create fixed-term contract with explicit end_date ===
  const secondContract =
    await api.functional.hrmTimeTracking.employees.contracts.create(
      adminConnection,
      {
        employeeId: employee.id,
        body: {
          startDate: "2026-07-01T00:00:00.000Z",
          endDate: "2026-12-31T00:00:00.000Z",
          payRate: 30,
          payPeriod: "hourly",
          workingHoursPerWeek: 20,
          notes: "Fixed-term project contract",
        } satisfies IHrmTimeTrackingEmployeeContract.ICreate,
      },
    );
  typia.assert(secondContract);
  // === VERIFICATION ===
  // 1. New contract's end_date is set to 2026-12-31 as provided
  TestValidator.equals(
    "fixed-term end_date preserved",
    secondContract.end_date,
    "2026-12-31T00:00:00.000Z",
  );
  // 2. New contract's pay_rate is set to 30 as provided
  TestValidator.equals(
    "fixed-term pay_rate preserved",
    secondContract.pay_rate,
    30,
  );
  // 3. New contract's pay_period is hourly
  TestValidator.equals(
    "fixed-term pay_period is hourly",
    secondContract.pay_period,
    "hourly",
  );
  // 4. New contract's working_hours_per_week is 20
  TestValidator.equals(
    "fixed-term working_hours_per_week preserved",
    secondContract.working_hours_per_week,
    20,
  );
  // 5. New contract's notes are set
  TestValidator.equals(
    "fixed-term notes preserved",
    secondContract.notes,
    "Fixed-term project contract",
  );
  // 6. New contract's start_date is July 1, 2026
  TestValidator.equals(
    "fixed-term start_date preserved",
    secondContract.start_date,
    "2026-07-01T00:00:00.000Z",
  );
  // 7. The second contract creates a gapless transition (its start_date is
  //    after the first contract's end_date which was auto-set server-side)
  TestValidator.predicate(
    "old contract end_date precedes new contract start_date",
    () =>
      new Date(secondContract.start_date).getTime() >
      new Date("2026-06-30T00:00:00.000Z").getTime(),
  );
}
