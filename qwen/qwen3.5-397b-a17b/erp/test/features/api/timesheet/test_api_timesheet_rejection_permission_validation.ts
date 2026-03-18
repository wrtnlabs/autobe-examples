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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test permission-based access control for timesheet rejection.
 * Setup: Create two member accounts - one as an employee who owns the timesheet,
 * and one as a member without time:approve permission. The employee creates and
 * submits a timesheet for approval. The member without time:approve permission
 * attempts to reject the submitted timesheet. Validation: Verify the rejection
 * request fails with a permission denied error, ensuring only users with
 * time:approve permission can reject timesheets.
 */
export async function test_api_timesheet_rejection_permission_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account WITHOUT time:approve permission (will attempt rejection)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedMember = await authorize_member_join(
    unauthorizedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
        phone_number: RandomGenerator.mobile(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(unauthorizedMember);
  // 2. Create member account who will own the timesheet (employee)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeMember);
  // 3. Create employee record for the timesheet owner within the organization
  const employee = await generate_random_hrm_platform_member_employees_create(
    employeeConnection,
    {
      body: {
        member_id: employeeMember.id,
        employment_type: "full-time",
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Create draft timesheet for a specific week period
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: new Date().toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 5. Submit the draft timesheet to change status to 'submitted'
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // 6. Attempt to reject the timesheet using the unauthorized member (without time:approve permission)
  // This should fail with permission denied error
  await TestValidator.error("permission denied for rejection", async () => {
    await api.functional.hrmPlatform.member.timesheets.reject(
      unauthorizedConnection,
      {
        timesheetId: submittedTimesheet.id,
        body: {
          rejection_reason: "Testing permission validation",
        } satisfies IHrmPlatformTimesheet.IReject,
      },
    );
  });
}