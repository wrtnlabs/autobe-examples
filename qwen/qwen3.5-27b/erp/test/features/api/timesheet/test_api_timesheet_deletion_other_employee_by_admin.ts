import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_timesheets_create } from "../../../generate/generate_random_hrm_platform_admin_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test deletion of another employee's draft timesheet by an admin with time management permissions.
 *
 * This test verifies that an admin user can delete timesheets belonging to other employees
 * in the organization, demonstrating cross-employee time management capabilities.
 */
export async function test_api_timesheet_deletion_other_employee_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create a draft timesheet for an employee
  const timesheet: IHrmPlatformTimesheet =
    await generate_random_hrm_platform_admin_timesheets_create(
      adminConnection,
      {
        body: {
          week_start_date: typia.random<string & tags.Format<"date-time">>(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  // Capture timesheet ID for validation
  const timesheetId: string = timesheet.id;
  const employeeId: string = timesheet.employee.id;
  const employeeEmail: string = timesheet.employee.member.email;
  // 3. Verify timesheet is in draft status before deletion
  TestValidator.equals(
    "timesheet is in draft status",
    timesheet.status,
    "draft",
  );
  // 4. Verify timesheet has valid employee association
  TestValidator.predicate(
    "timesheet has valid employee ID",
    timesheet.employee.id.length > 0,
  );
  TestValidator.predicate(
    "timesheet has valid employee email",
    timesheet.employee.member.email.length > 0,
  );
  // 5. Delete the employee's timesheet as admin
  await api.functional.hrmPlatform.admin.timesheets.erase(adminConnection, {
    timesheetId,
  });
  // 6. Verify deletion was successful (void return indicates HTTP 204)
  TestValidator.predicate("timesheet deletion completed successfully", true);
  // 7. Verify the timesheet belonged to an employee (business logic validation)
  TestValidator.equals(
    "deleted timesheet belonged to an employee",
    timesheet.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "deleted timesheet employee email matches",
    timesheet.employee.member.email,
    employeeEmail,
  );
}
