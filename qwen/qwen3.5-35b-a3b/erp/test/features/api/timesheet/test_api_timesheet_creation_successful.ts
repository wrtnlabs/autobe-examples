import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
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
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication and organization creation
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(authResponse);
  // 2. Calculate Monday to Sunday week range
  const today = new Date();
  const dayOfWeek = today.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() + mondayOffset,
    ),
  );
  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  // Format dates as ISO 8601 strings
  const startDate = monday.toISOString();
  const endDate = sunday.toISOString();
  // 3. Create timesheet with notes
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    memberConnection,
    {
      body: {
        hrm_platform_employee_id: authResponse.member.id,
        start_date: startDate,
        end_date: endDate,
        notes: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 4. Validate timesheet structure and business logic
  TestValidator.equals(
    "timesheet status is pending",
    timesheet.status,
    "pending",
  );
  TestValidator.equals("total_hours is NULL", timesheet.total_hours, null);
  TestValidator.equals("submitted_at is NULL", timesheet.submitted_at, null);
  TestValidator.equals("approved_at is NULL", timesheet.approved_at, null);
  TestValidator.equals("rejected_at is NULL", timesheet.rejected_at, null);
  TestValidator.equals("cancelled_at is NULL", timesheet.cancelled_at, null);
  TestValidator.notEquals("notes provided", timesheet.notes, null);
  TestValidator.equals("timelogs array is empty", timesheet.timelogs.length, 0);
  TestValidator.equals(
    "employee id matches",
    timesheet.hrm_platform_employee_id,
    authResponse.member.id,
  );
  // Verify date calculation: end_date should be exactly 6 days after start_date
  const start = new Date(timesheet.start_date);
  const end = new Date(timesheet.end_date);
  const expectedEnd = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  TestValidator.equals(
    "end date is 6 days after start",
    end.toISOString(),
    expectedEnd.toISOString(),
  );
  // Verify start date is Monday (dayOfWeek should be 1)
  const startDayOfWeek = start.getUTCDay();
  TestValidator.equals("start date is Monday", startDayOfWeek, 1);
}
