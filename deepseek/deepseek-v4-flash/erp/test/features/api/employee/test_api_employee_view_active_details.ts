import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
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
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_view_active_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a new organization (member becomes owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch to the organization context
  const switched =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switched);
  // 4. List employees to get a valid employee ID (the owner's auto-created record)
  const employeeList = await api.functional.hrmTimeTracking.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(employeeList);
  TestValidator.predicate(
    "employee list has at least one record",
    () => employeeList.data.length > 0,
  );
  // 5. Retrieve the active employee's complete profile
  const employeeId = employeeList.data[0].id;
  const employee = await api.functional.hrmTimeTracking.employees.at(
    memberConnection,
    {
      employeeId,
    },
  );
  typia.assert(employee);
  // Validate key business logic fields
  TestValidator.equals("employee id matches", employee.id, employeeId);
  TestValidator.predicate(
    "employee role is built_in (Owner)",
    () => employee.role.type === "built_in",
  );
  TestValidator.predicate(
    "employee belongs to the created organization",
    () => employee.organization.id === organization.id,
  );
  TestValidator.predicate(
    "assignedTasksCount is non-negative",
    () => employee.assignedTasksCount >= 0,
  );
  TestValidator.predicate(
    "timelogsCount is non-negative",
    () => employee.timelogsCount >= 0,
  );
  TestValidator.predicate(
    "timesheetsCount is non-negative",
    () => employee.timesheetsCount >= 0,
  );
  TestValidator.predicate(
    "timersCount is non-negative",
    () => employee.timersCount >= 0,
  );
}
