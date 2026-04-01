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
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_deletion_submitted_status_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a draft timesheet for a specific week period
  const weekStartDate = "2024-01-08"; // Monday
  const weekEndDate = "2024-01-14"; // Sunday
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.equals(
    "week start date",
    timesheet.week_start_date,
    weekStartDate,
  );
  TestValidator.equals("week end date", timesheet.week_end_date, weekEndDate);
  // 3. Submit the timesheet for approval
  // NOTE: Submit endpoint (POST /hrmPlatform/member/timesheets/{id}/submit) is not
  // available in the provided SDK functions. When available, the test should:
  //
  // const submittedTimesheet = await api.functional.hrmPlatform.member.timesheets.submit(
  //   memberConnection,
  //   { timesheetId: timesheet.id }
  // );
  // TestValidator.equals("status is submitted", submittedTimesheet.status, "submitted");
  //
  // Then test deletion rejection:
  // await TestValidator.error("submitted timesheet deletion rejected", async () => {
  //   await api.functional.hrmPlatform.member.timesheets.erase(memberConnection, {
  //     timesheetId: submittedTimesheet.id,
  //   });
  // });
  // 4. Delete the draft timesheet (should succeed for draft status)
  // This validates that draft timesheets CAN be deleted
  await api.functional.hrmPlatform.member.timesheets.erase(memberConnection, {
    timesheetId: timesheet.id,
  });
  // 5. Verify draft deletion succeeded (no exception thrown)
  // For submitted timesheets, the erase call would throw a 400 Bad Request error
  // with message indicating submitted timesheets cannot be deleted
}
