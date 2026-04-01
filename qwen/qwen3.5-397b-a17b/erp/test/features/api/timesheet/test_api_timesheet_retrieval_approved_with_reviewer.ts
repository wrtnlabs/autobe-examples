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

export async function test_api_timesheet_retrieval_approved_with_reviewer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as manager with time:approve permission
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Manager123!",
      display_name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Authenticate as employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Employee123!",
      display_name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 3. Employee creates a draft timesheet for a specific week
  // Use a fixed week: 2024-01-01 (Monday) to 2024-01-07 (Sunday)
  const weekStartDate = "2024-01-01";
  const weekEndDate = "2024-01-07";
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 4. Employee creates timelogs within that week period
  const timelog1 = await api.functional.hrmPlatform.member.timelogs.create(
    employeeConnection,
    {
      body: {
        date: "2024-01-02T00:00:00.000Z",
        durationMinutes: 480,
        projectId: typia.random<string & tags.Format<"uuid">>(),
        description: "Development work",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  const timelog2 = await api.functional.hrmPlatform.member.timelogs.create(
    employeeConnection,
    {
      body: {
        date: "2024-01-03T00:00:00.000Z",
        durationMinutes: 360,
        projectId: typia.random<string & tags.Format<"uuid">>(),
        description: "Meeting and planning",
        billable: false,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // 5. Employee submits the timesheet for approval
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // 6. Manager approves the submitted timesheet
  const approvedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.approve(
      managerConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  // 7. Retrieve the approved timesheet using its ID
  const retrievedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.at(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // 8. Validate the response
  TestValidator.equals(
    "status is approved",
    retrievedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    retrievedTimesheet.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewedByEmployee exists",
    retrievedTimesheet.reviewedByEmployee !== null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    retrievedTimesheet.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "timelogs are included",
    retrievedTimesheet.timelogs.length > 0,
  );
  TestValidator.equals(
    "week_start_date matches",
    retrievedTimesheet.week_start_date,
    weekStartDate,
  );
  TestValidator.equals(
    "week_end_date matches",
    retrievedTimesheet.week_end_date,
    weekEndDate,
  );
}