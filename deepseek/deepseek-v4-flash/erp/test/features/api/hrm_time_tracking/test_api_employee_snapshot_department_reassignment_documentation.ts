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

export async function test_api_employee_snapshot_department_reassignment_documentation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an organization — member becomes owner with Owner role (employee:manage permission)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch organization context to the newly created organization
  const switched =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switched);
  // 4. List employees to find the owner's employee record ID
  const employeePage = await api.functional.hrmTimeTracking.employees.index(
    memberConnection,
    {
      body: {} satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(employeePage);
  const employee = employeePage.data[0]!;
  typia.assert(employee);
  // 5. Create a manual snapshot documenting a department reassignment
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await generate_random_hrm_time_tracking_employees_snapshots_create(
      memberConnection,
      {
        body: {
          changed_field: "department_id",
          old_value: null,
          new_value: departmentId,
        },
        params: {
          employeeId: employee.id,
        },
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot response
  TestValidator.equals(
    "department is null (no prior assignment)",
    snapshot.department,
    null,
  );
  TestValidator.equals(
    "changedField is department_id",
    snapshot.changedField,
    "department_id",
  );
  TestValidator.equals("oldValue is null", snapshot.oldValue, null);
  TestValidator.equals(
    "newValue matches provided department ID",
    snapshot.newValue,
    departmentId,
  );
}
