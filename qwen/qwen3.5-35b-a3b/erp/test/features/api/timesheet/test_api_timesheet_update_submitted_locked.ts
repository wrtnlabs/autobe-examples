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

export async function test_api_timesheet_update_submitted_locked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Set Authorization header directly with the access token
  memberConnection.headers = {
    Authorization: `Bearer ${joinResponse.token.access}`,
  };
  // 3. Create a timesheet in pending status
  // Need to get employee ID first - get it from member info
  const employeeId = joinResponse.member.id;
  // Calculate week dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Monday
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6); // Sunday
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    memberConnection,
    {
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        hrm_platform_employee_id: employeeId,
        notes: "Initial notes",
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 4. Update status to 'submitted' via the update endpoint
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          notes: "Submitted notes",
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(submittedTimesheet);
  // 5. Attempt to update the submitted timesheet
  // This should fail with 409 Conflict
  await TestValidator.error("update submitted timesheet", async () => {
    await api.functional.hrmPlatform.member.timesheets.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          notes: "Modified notes",
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  });
  // 6. Verify timesheet remains unchanged
  const currentTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          notes: "Initial notes",
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(currentTimesheet);
}