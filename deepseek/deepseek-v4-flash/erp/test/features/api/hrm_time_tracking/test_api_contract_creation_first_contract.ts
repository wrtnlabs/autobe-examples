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

export async function test_api_contract_creation_first_contract(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create the owner member connection and join
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  // Step 2: Create the employee member connection and join
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 3: Owner creates the organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 4: Owner creates a custom role with employee:manage permission
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: "EmployeeManager",
          permissions: ["employee:manage"],
        },
      },
    );
  typia.assert(role);
  // Step 5: Owner invites the employee by email
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: employeeEmail,
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // Step 6: Re-authenticate the employee to get updated data with employee record
  const employeeRefreshed = await authorize_member_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeRefreshed);
  // Step 7: Extract the employee ID from the employee's updated data
  const employeeId = employeeRefreshed.employees[0]!.id;
  // Step 8: Create the contract with specific values using the generation utility
  const contract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      ownerConnection,
      {
        params: {
          employeeId,
        },
        body: {
          startDate: "2026-05-01T00:00:00.000Z",
          payRate: 50000,
          payPeriod: "weekly",
          workingHoursPerWeek: 40,
          notes: "Initial employment contract",
        },
      },
    );
  typia.assert(contract);
  // Step 9: Validate the contract response
  TestValidator.equals(
    "start_date matches",
    contract.start_date,
    "2026-05-01T00:00:00.000Z",
  );
  TestValidator.equals("end_date is null", contract.end_date, null);
  TestValidator.equals("pay_rate matches", contract.pay_rate, 50000);
  TestValidator.equals("pay_period matches", contract.pay_period, "weekly");
  TestValidator.equals(
    "working_hours_per_week matches",
    contract.working_hours_per_week,
    40,
  );
  TestValidator.equals(
    "notes match",
    contract.notes,
    "Initial employment contract",
  );
  TestValidator.predicate(
    "created_at is set",
    () => contract.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is set",
    () => contract.updated_at !== null,
  );
  TestValidator.predicate(
    "employee relation is resolved",
    () =>
      contract.employee !== undefined &&
      contract.employee.id === employeeId &&
      contract.employee.member !== undefined &&
      contract.employee.member.email === employeeEmail,
  );
}
