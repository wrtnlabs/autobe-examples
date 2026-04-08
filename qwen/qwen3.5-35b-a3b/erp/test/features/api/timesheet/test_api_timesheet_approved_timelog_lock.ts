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
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_approved_timelog_lock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member connection using the auth token from join
  const memberCon: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Generate random timesheet with timelogs
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberCon,
    {
      body: {
        notes: "Timesheet for approval lock test",
      },
    },
  );
  typia.assert(timesheet);
  // Get the employee ID and project ID from the created timelog
  const employeeId = timesheet.employee.id;
  const firstTimelogId = timesheet.timelogs[0]?.id;
  const projectId = timesheet.timelogs[0]?.project.id;
  TestValidator.equals(
    "timesheet has at least one timelog",
    !!firstTimelogId,
    true,
  );
  TestValidator.equals("employee ID is valid", employeeId !== undefined, true);
  TestValidator.equals("project ID is valid", projectId !== undefined, true);
  // 4. Create a new timelog to attempt adding it to timesheet
  const newTimelog = await api.functional.hrmPlatform.member.timelogs.create(
    memberCon,
    {
      body: {
        employee_id: employeeId,
        project_id: projectId,
        start_datetime: new Date().toISOString(),
        end_datetime: new Date(Date.now() + 3600000).toISOString(),
        duration_minutes: 60,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(newTimelog);
  // 5. Attempt to add timelog to timesheet - should fail for non-draft timesheets
  await TestValidator.error(
    "cannot add timelog to non-draft timesheet",
    async () => {
      await api.functional.hrmPlatform.member.timesheets.timelogs.manage(
        memberCon,
        {
          timesheetId: timesheet.id,
          body: {
            adds: [newTimelog.id],
          },
        },
      );
    },
  );
  // 6. Verify timesheet remains unchanged after failed add attempt
  const afterAddTimesheet =
    await api.functional.hrmPlatform.member.timesheets.timelogs.manage(
      memberCon,
      {
        timesheetId: timesheet.id,
        body: {},
      },
    );
  typia.assert(afterAddTimesheet);
  TestValidator.equals(
    "timesheet timelog count unchanged after failed add",
    afterAddTimesheet.timelogs.length,
    timesheet.timelogs.length,
  );
  // 7. Attempt to remove existing timelog from timesheet
  if (firstTimelogId) {
    await TestValidator.error(
      "cannot remove timelog from non-draft timesheet",
      async () => {
        await api.functional.hrmPlatform.member.timesheets.timelogs.manage(
          memberCon,
          {
            timesheetId: timesheet.id,
            body: {
              removes: [firstTimelogId],
            },
          },
        );
      },
    );
    // 8. Verify timesheet remains unchanged after failed remove attempt
    const afterRemoveTimesheet =
      await api.functional.hrmPlatform.member.timesheets.timelogs.manage(
        memberCon,
        {
          timesheetId: timesheet.id,
          body: {},
        },
      );
    typia.assert(afterRemoveTimesheet);
    TestValidator.equals(
      "timesheet timelog count unchanged after failed remove",
      afterRemoveTimesheet.timelogs.length,
      timesheet.timelogs.length,
    );
    TestValidator.equals(
      "timesheet total hours unchanged",
      afterRemoveTimesheet.total_hours,
      timesheet.total_hours,
    );
  }
  // 9. Verify timesheet status hasn't changed
  TestValidator.equals(
    "timesheet status remains unchanged",
    afterAddTimesheet.status,
    timesheet.status,
  );
}
