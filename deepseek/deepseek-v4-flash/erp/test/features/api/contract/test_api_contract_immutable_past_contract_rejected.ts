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

/**
 * Test that updating a past/immutable contract (one with an end_date) is rejected.
 *
 * Validates the business invariant that once a contract has an end_date set,
 * its compensation terms become frozen as immutable historical records.
 *
 * 1. Member A (owner) joins and creates an organization with a custom role
 * 2. Member A invites a new email (non-member) to the organization
 * 3. Member B joins with that email, accepting the invitation → employee record created
 * 4. Using Member A's connection (employee:manage), create an active contract for Member B
 * 5. First update: set end_date on the active contract → it becomes a past/immutable contract
 * 6. Second update: attempt to modify the now-past contract → expect 422 rejection
 * 7. Verify the contract's pay_rate remains unchanged at 4500
 */
export async function test_api_contract_immutable_past_contract_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and creates organization with custom role
  const memberAConn: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConn, {});
  typia.assert(memberA);
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConn,
      {},
    );
  typia.assert(organization);
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberAConn,
      {
        params: { organizationId: organization.id },
        body: {
          permissions: ["employee:manage"],
        },
      },
    );
  typia.assert(role);
  // 2. Member A invites a new email (non-member yet) to the organization
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConn,
      {
        body: {
          email: employeeEmail,
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // 3. Member B joins with that email → invitation matched, employee created
  const memberBConn: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConn, {
    body: {
      email: employeeEmail,
    },
  });
  typia.assert(memberB);
  // Member B's join response includes the employee record from invitation acceptance
  const employee = memberB.employees.find(
    (emp) => emp.member.email === employeeEmail,
  );
  if (employee === undefined)
    throw new Error("Employee not found after invitation acceptance");
  const employeeId = employee.id;
  // 4. Create an active contract for the employee using Member A's connection (employee:manage)
  const contract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      memberAConn,
      {
        params: { employeeId },
        body: {
          startDate: "2026-01-01T00:00:00.000Z",
          payRate: 4500,
          payPeriod: "monthly" as const,
          workingHoursPerWeek: 40,
        },
      },
    );
  typia.assert(contract);
  TestValidator.equals("initial pay_rate is 4500", contract.pay_rate, 4500);
  // 5. First update: set end_date to make it a past contract
  const endedContract =
    await api.functional.hrmTimeTracking.employees.contracts.update(
      memberAConn,
      {
        employeeId,
        contractId: contract.id,
        body: {
          end_date: "2026-03-15T00:00:00.000Z",
        } satisfies IHrmTimeTrackingEmployeeContract.IUpdate,
      },
    );
  typia.assert(endedContract);
  TestValidator.equals(
    "pay_rate still 4500 after setting end_date",
    endedContract.pay_rate,
    4500,
  );
  TestValidator.equals(
    "end_date is set",
    endedContract.end_date,
    "2026-03-15T00:00:00.000Z",
  );
  // 6. Second update: attempt to modify the now-past contract → expect 422
  await TestValidator.httpError(
    "past contract modification rejected with 422",
    422,
    async () => {
      await api.functional.hrmTimeTracking.employees.contracts.update(
        memberAConn,
        {
          employeeId,
          contractId: contract.id,
          body: {
            pay_rate: 5000,
          } satisfies IHrmTimeTrackingEmployeeContract.IUpdate,
        },
      );
    },
  );
}
