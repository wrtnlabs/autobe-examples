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
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test timesheet creation with existing timelogs for the week.
 *
 * This test validates the primary success path for creating a draft timesheet
 * when the employee has existing timelogs for the target week. The test verifies:
 * 1. Member registration and authentication
 * 2. Timelog creation within a specific week period
 * 3. Timesheet creation automatically associates existing timelogs
 * 4. Draft status fields are properly initialized (null for submission/review fields)
 */
export async function test_api_timesheet_creation_with_existing_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Define a specific week period (Monday to Sunday)
  const weekStart = "2026-03-23"; // Monday
  const weekEnd = "2026-03-29"; // Sunday (6 days after Monday)
  // 3. Create multiple timelog entries within the week
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const timelogCount = 3;
  const totalDurationMinutes = 240; // 4 hours total
  const durationPerTimelog = totalDurationMinutes / timelogCount;
  const timelogs: IHrmPlatformTimelog[] = [];
  for (let i = 0; i < timelogCount; i++) {
    const timelogDate = new Date(2026, 2, 23 + i).toISOString(); // March 23-25, 2026
    const timelog = await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: timelogDate,
          durationMinutes: durationPerTimelog,
          projectId: projectId,
          description: `Timelog entry ${i + 1} for test week`,
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
    typia.assert(timelog);
    timelogs.push(timelog);
  }
  // 4. Create draft timesheet for the same week period
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStart,
        week_end_date: weekEnd,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 5. Verify timesheet status is 'draft'
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 6. Verify all timelogs are associated with the timesheet
  TestValidator.equals(
    "timelog count matches",
    timesheet.timelogs.length,
    timelogs.length,
  );
  // Verify each timelog has the timesheet reference
  for (const timelog of timesheet.timelogs) {
    TestValidator.predicate(
      "timelog has timesheet reference",
      timelog.timesheet !== null,
    );
    if (timelog.timesheet !== null) {
      TestValidator.equals(
        "timesheet ID matches",
        timelog.timesheet.id,
        timesheet.id,
      );
    }
  }
  // 7. Verify draft status fields are null
  TestValidator.equals(
    "submitted_at is null for draft",
    timesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null for draft",
    timesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "reviewed_by_employee_id is null for draft",
    timesheet.reviewed_by_employee_id,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null for draft",
    timesheet.rejection_reason,
    null,
  );
  // 8. Verify week dates match
  TestValidator.equals(
    "week_start_date matches",
    timesheet.week_start_date,
    weekStart,
  );
  TestValidator.equals(
    "week_end_date matches",
    timesheet.week_end_date,
    weekEnd,
  );
  // 9. Verify employee reference exists
  TestValidator.predicate(
    "employee reference exists",
    timesheet.employee !== null,
  );
  // 10. Verify reviewedByEmployee is null for draft
  TestValidator.equals(
    "reviewedByEmployee is null for draft",
    timesheet.reviewedByEmployee,
    null,
  );
}
