import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

/**
 * Test that a user without time:approve permission cannot approve a timesheet.
 *
 * Validates the permission-based access control for the timesheet approval workflow by attempting to approve a timesheet with an unauthorized user. The test ensures that only users with the time:approve permission can approve submitted timesheets.
 *
 * 1. Create and authenticate first member (unauthorized user without time:approve permission).
 * 2. Create and authenticate second member (timesheet owner).
 * 3. Create a draft timesheet for the second member's employee record.
 * 4. Submit the draft timesheet for approval.
 * 5. Attempt to approve the submitted timesheet using the first member's connection.
 * 6. Verify the system returns a 403 HTTP error indicating insufficient permissions.
 */
export async function test_api_timesheet_approval_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create unauthorized member (employee without approval permission)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedMember = await authorize_member_join(
    unauthorizedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(unauthorizedMember);
  // 2. Create timesheet owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(ownerMember);
  // 3. Create a draft timesheet for the owner member
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const weekStartDate = new Date();
  // Normalize to Monday
  const dayOfWeek = weekStartDate.getDay();
  const diff = weekStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  weekStartDate.setDate(diff);
  weekStartDate.setHours(0, 0, 0, 0);
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      ownerConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
      },
    );
  typia.assert(timesheet);
  // 4. Submit the timesheet
  const submittedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.submit(
      ownerConnection,
      {
        organizationId,
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  // 5. Attempt to approve with unauthorized member - should fail with 403
  await TestValidator.httpError(
    "unauthorized approval should return 403",
    403,
    async () => {
      await api.functional.hrm.member.timesheets.approve(
        unauthorizedConnection,
        {
          timesheetId: timesheet.id,
        },
      );
    },
  );
}