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

export async function test_api_contract_compensation_terms_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A as organization owner
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role with employee:manage permission
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberAConnection,
      {
        params: { organizationId: organization.id },
      },
    );
  typia.assert(role);
  // 4. Prepare employee B's email (not yet registered — creates pending invitation)
  const employeeEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const employeePassword: string = RandomGenerator.alphaNumeric(16);
  // 5. Member A invites employee B — creates pending invitation
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: employeeEmail,
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // 6. Register employee B with the invited email — auto-accepts invitation and
  //    creates an active employee record
  const employeeBConnection: api.IConnection = { host: connection.host };
  const employeeBResult = await authorize_member_join(employeeBConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
    },
  });
  typia.assert(employeeBResult);
  // Extract employee ID from member B's authorized response (employees array)
  const employeeId: string = employeeBResult.employees[0]!.id;
  // 7. Create an active contract for employee B
  //    Use start_date in the past, pay_rate=3000, pay_period=monthly,
  //    working_hours_per_week=40, end_date=null (active)
  const contract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      memberAConnection,
      {
        params: { employeeId },
        body: {
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: undefined,
          payRate: 3000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: undefined,
        },
      },
    );
  typia.assert(contract);
  // 8. Update compensation terms
  const updatedContract: IHrmTimeTrackingEmployeeContract =
    await api.functional.hrmTimeTracking.employees.contracts.update(
      memberAConnection,
      {
        employeeId,
        contractId: contract.id,
        body: {
          pay_rate: 3500,
          pay_period: "weekly",
          working_hours_per_week: 35,
          notes: "Updated terms after promotion",
        } satisfies IHrmTimeTrackingEmployeeContract.IUpdate,
      },
    );
  typia.assert(updatedContract);
  // 9. Validate updated fields
  TestValidator.equals("pay rate updated", updatedContract.pay_rate, 3500);
  TestValidator.equals(
    "pay period updated",
    updatedContract.pay_period,
    "weekly",
  );
  TestValidator.equals(
    "working hours updated",
    updatedContract.working_hours_per_week,
    35,
  );
  TestValidator.equals(
    "notes updated",
    updatedContract.notes,
    "Updated terms after promotion",
  );
  // Timestamp validation
  TestValidator.predicate(
    "updated_at is newer than created_at",
    () =>
      new Date(updatedContract.updated_at).getTime() >
      new Date(updatedContract.created_at).getTime(),
  );
  // Immutable fields remain unchanged
  TestValidator.equals("end_date remains null", updatedContract.end_date, null);
  TestValidator.equals("id unchanged", updatedContract.id, contract.id);
  TestValidator.equals(
    "start_date unchanged",
    updatedContract.start_date,
    contract.start_date,
  );
}
