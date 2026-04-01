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

export async function test_api_timesheet_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Calculate current week dates (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const weekStartDate = monday.toISOString().split("T")[0]; // YYYY-MM-DD
  const weekEndDate = sunday.toISOString().split("T")[0]; // YYYY-MM-DD
  // 3. Create draft timesheet for current week
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate satisfies string & tags.Format<"date">,
        week_end_date: weekEndDate satisfies string & tags.Format<"date">,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 4. Add timelogs to the timesheet
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: monday.toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        projectId: projectId satisfies string & tags.Format<"uuid">,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: tuesday.toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        projectId: projectId satisfies string & tags.Format<"uuid">,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        billable: false,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // 5. Retrieve the timesheet by ID
  const retrievedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.at(memberConnection, {
      timesheetId: timesheet.id satisfies string & tags.Format<"uuid">,
    });
  typia.assert(retrievedTimesheet);
  // 6. Validate timesheet structure and content
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "week start date",
    retrievedTimesheet.week_start_date,
    weekStartDate,
  );
  TestValidator.equals(
    "week end date",
    retrievedTimesheet.week_end_date,
    weekEndDate,
  );
  TestValidator.equals("status is draft", retrievedTimesheet.status, "draft");
  // Validate draft status fields are null
  TestValidator.equals(
    "submitted_at is null for draft",
    retrievedTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null for draft",
    retrievedTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null for draft",
    retrievedTimesheet.rejection_reason,
    null,
  );
  TestValidator.equals(
    "reviewed_by_employee_id is null for draft",
    retrievedTimesheet.reviewed_by_employee_id,
    null,
  );
  // Validate employee details match authenticated user
  TestValidator.equals(
    "employee user ID matches",
    retrievedTimesheet.employee.user.id,
    authResult.id,
  );
  TestValidator.equals(
    "employee display name matches",
    retrievedTimesheet.employee.user.display_name,
    authResult.display_name,
  );
  // Validate timelogs are included
  TestValidator.predicate(
    "timelogs array exists",
    Array.isArray(retrievedTimesheet.timelogs),
  );
  TestValidator.predicate(
    "has at least 2 timelogs",
    retrievedTimesheet.timelogs.length >= 2,
  );
  // Validate each timelog has required structure
  for (const timelog of retrievedTimesheet.timelogs) {
    TestValidator.equals(
      "timelog employee matches",
      timelog.employee.id,
      retrievedTimesheet.employee.id,
    );
    TestValidator.predicate("timelog has project", timelog.project !== null);
    TestValidator.predicate(
      "timelog duration is positive",
      timelog.durationMinutes > 0,
    );
    TestValidator.predicate("timelog has valid date", timelog.date !== null);
  }
}
