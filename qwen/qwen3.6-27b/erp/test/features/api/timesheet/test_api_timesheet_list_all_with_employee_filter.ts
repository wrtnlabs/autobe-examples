import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

/**
 * Test listing all organization timesheets and filtering by employee as a member with time:approve permission.
 *
 * This test validates the timesheet listing endpoint's ability to return all timesheets across the organization
 * for members with time:approve or time:manage permissions (organization owners). It verifies that filtering
 * by a specific employee correctly restricts results to only that employee's timesheets, and that employee
 * metadata is properly populated in each timesheet response.
 *
 * Special attention is given to confirming that members with elevated permissions can access all organizational
 * timesheets regardless of ownership, and that the employee filter parameter functions as an equality-based
 * restriction on the employee record identifier.
 *
 * 1. Authenticate a new member via join, which automatically creates an organization owner with time:approve
 *    and time:manage permissions.
 * 2. Create a second employee in the organization using employee creation utility.
 * 3. Call PATCH /hrmPlatform/member/timesheets without filters to retrieve all organization timesheets.
 * 4. Verify that at least one timesheet exists (owner's timesheet) and that employee information including
 *    member details and department is populated.
 * 5. Call PATCH /hrmPlatform/member/timesheets with employeeId filter set to the second employee's ID.
 * 6. Verify that only timesheets belonging to the second employee are returned in the filtered results.
 * 7. Confirm pagination metadata is included in all responses.
 */
export async function test_api_timesheet_list_all_with_employee_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as organization owner (gets time:approve and time:manage permissions)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: typia.random<IHrmPlatformMember.IJoin>(),
  });
  typia.assert(ownerAuth);
  // 2. Create a second employee in the organization
  const secondEmployee =
    await generate_random_hrm_platform_member_employees_create(
      ownerConnection,
      {},
    );
  typia.assert(secondEmployee);
  // 3. Call PATCH /hrmPlatform/member/timesheets without filters (list all org timesheets)
  const allTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(ownerConnection, {
      body: {} satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(allTimesheets);
  // 4. Verify timesheets exist and employee information is populated
  TestValidator.predicate(
    "organization timesheets exist",
    allTimesheets.data.length > 0,
  );
  TestValidator.predicate(
    "pagination record count positive",
    allTimesheets.pagination.records > 0,
  );
  const ownerTimesheet = allTimesheets.data[0];
  TestValidator.predicate(
    "owner timesheet has employee info",
    ownerTimesheet.employee !== undefined,
  );
  TestValidator.equals(
    "owner timesheet belongs to owner",
    ownerTimesheet.employee.member.id,
    ownerAuth.id,
  );
  // 5. Call PATCH /hrmPlatform/member/timesheets with employeeId filter
  const employeeTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(ownerConnection, {
      body: {
        employeeId: secondEmployee.id,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(employeeTimesheets);
  // 6. Verify filtered results belong only to second employee
  for (const ts of employeeTimesheets.data) {
    TestValidator.equals(
      "filtered timesheet belongs to second employee",
      ts.employee.member.id,
      secondEmployee.member.id,
    );
  }
  // 7. Verify pagination metadata is present in filtered response
  TestValidator.equals(
    "filtered response has current page",
    employeeTimesheets.pagination.current,
    1,
  );
  TestValidator.predicate(
    "filtered response has valid limit",
    employeeTimesheets.pagination.limit >= 1,
  );
}
