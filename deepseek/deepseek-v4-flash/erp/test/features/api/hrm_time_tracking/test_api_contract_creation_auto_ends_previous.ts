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

export async function test_api_contract_creation_auto_ends_previous(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member A (owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Create organization
  const org =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(org);
  // 3. Create role with employee:manage permission
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberAConnection,
      {
        params: { organizationId: org.id },
        body: {
          permissions: ["employee:manage"],
        },
      },
    );
  typia.assert(role);
  // 4. Join member B (future employee)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    },
  });
  // 5. Invite member B to the organization (auto-creates employee record)
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: memberBEmail,
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // 6. Login as member B to get employee data after invitation
  const memberBAuthorized = await authorize_member_login(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuthorized);
  const employeeId = memberBAuthorized.employees[0]!.id;
  // 7. Create first contract (start_date = 2026-01-01, no end_date, active)
  const firstContract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      memberAConnection,
      {
        params: { employeeId },
        body: {
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: undefined,
          payRate: 40000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: undefined,
        },
      },
    );
  typia.assert(firstContract);
  TestValidator.equals(
    "first contract start date",
    firstContract.start_date,
    "2026-01-01T00:00:00.000Z",
  );
  TestValidator.predicate(
    "first contract end_date is null",
    firstContract.end_date === null,
  );
  TestValidator.predicate(
    "first contract pay rate",
    firstContract.pay_rate === 40000,
  );
  // 8. Create second contract (start_date = 2026-06-01, no end_date)
  // This should auto-end the first contract server-side
  const secondContract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      memberAConnection,
      {
        params: { employeeId },
        body: {
          startDate: "2026-06-01T00:00:00.000Z",
          endDate: undefined,
          payRate: 50000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Promotion contract",
        },
      },
    );
  typia.assert(secondContract);
  // 9. Verify second contract properties
  TestValidator.equals(
    "second contract start date",
    secondContract.start_date,
    "2026-06-01T00:00:00.000Z",
  );
  TestValidator.predicate(
    "second contract end_date is null",
    secondContract.end_date === null,
  );
  TestValidator.predicate(
    "second contract pay rate",
    secondContract.pay_rate === 50000,
  );
  TestValidator.equals(
    "second contract pay period",
    secondContract.pay_period,
    "monthly",
  );
  TestValidator.equals(
    "second contract notes",
    secondContract.notes,
    "Promotion contract",
  );
  TestValidator.predicate(
    "contract IDs are different",
    firstContract.id !== secondContract.id,
  );
}
