import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeSnapshot";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_employees_snapshots_create } from "../../../generate/generate_random_hrm_time_tracking_employees_snapshots_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_employee_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_employee_snapshot";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_snapshot_status_change_documentation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization (member becomes owner with active employee + Owner role)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch organization context to the newly created organization
  const switchedOrg =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switchedOrg);
  // 4. List employees to get the owner's employee ID
  const employeePage = await api.functional.hrmTimeTracking.employees.index(
    memberConnection,
    {
      body: {} satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(employeePage);
  TestValidator.predicate(
    "employee list has at least one employee",
    () => employeePage.data.length > 0,
  );
  const ownerEmployee = employeePage.data[0];
  // 5. Create a manual snapshot for the owner employee documenting status change
  const snapshot =
    await generate_random_hrm_time_tracking_employees_snapshots_create(
      memberConnection,
      {
        body: {
          changed_field: "status",
          old_value: "active",
          new_value: "deactivated",
        },
        params: {
          employeeId: ownerEmployee.id,
        },
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot fields
  TestValidator.equals(
    "employee id matches",
    snapshot.employee.id,
    ownerEmployee.id,
  );
  TestValidator.equals("actor id matches", snapshot.actor.id, authorized.id);
  TestValidator.equals(
    "changed field is status",
    snapshot.changedField,
    "status",
  );
  TestValidator.equals("old value is active", snapshot.oldValue, "active");
  TestValidator.equals(
    "new value is deactivated",
    snapshot.newValue,
    "deactivated",
  );
  TestValidator.predicate(
    "createdAt is present",
    () => snapshot.createdAt !== null && snapshot.createdAt !== "",
  );
  TestValidator.predicate(
    "role is present",
    () => snapshot.role !== null && snapshot.role.id !== "",
  );
  TestValidator.predicate(
    "status is captured",
    () => snapshot.status !== null && snapshot.status !== "",
  );
  TestValidator.predicate(
    "employment type is captured",
    () => snapshot.employmentType !== null && snapshot.employmentType !== "",
  );
}
