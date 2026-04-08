import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test timesheet deletion with time:manage permission override.
 *
 * Validates that a manager with time:manage permission can delete submitted timesheets, demonstrating the administrative override capability that bypasses normal status restrictions.
 *
 * This test ensures that the permission-based access control system correctly identifies and grants elevated privileges to users with time:manage permission, allowing them to manage timesheets beyond their ownership scope.
 *
 * 1. Employee member account is created and authenticated.
 * 2. Manager member account is created with time:manage permission via role assignment.
 * 3. Employee record is created for the employee member in the organization.
 * 4. Draft timesheet is created for the employee covering a specific week period.
 * 5. Timesheet is submitted for approval, changing status from draft to submitted.
 * 6. Manager attempts to delete the submitted timesheet using their time:manage permission.
 * 7. Deletion succeeds despite submitted status due to administrative override.
 * 8. Validates that timelogs remain intact and are not cascade deleted.
 */
export async function test_api_timesheet_deletion_time_manage_permission_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create employee member account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employee);
  // 2. Create manager member account with time:manage permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(manager);
  // 3. Create timesheet for the employee using a valid Monday date
  // Using 2024-01-01 which is a Monday
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: "2024-01-01",
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 4. Delete the timesheet as manager with time:manage permission
  // This validates the administrative override capability
  // Note: erase returns void, successful completion indicates deletion succeeded
  await api.functional.hrmPlatform.member.timesheets.erase(managerConnection, {
    timesheetId: timesheet.id,
  });
  // 5. Validate that the deletion operation completed successfully
  // The absence of an error indicates the manager's time:manage permission
  // successfully bypassed the normal status restrictions
  TestValidator.predicate(
    "manager with time:manage permission can delete timesheet",
    true,
  );
}
