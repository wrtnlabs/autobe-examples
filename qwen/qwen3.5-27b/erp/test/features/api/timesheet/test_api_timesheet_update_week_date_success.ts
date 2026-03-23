import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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

export async function test_api_timesheet_update_week_date_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a draft timesheet
  const originalTimesheet: IHrmPlatformTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(originalTimesheet);
  // 3. Calculate new week date (one week earlier)
  const originalWeekDate = new Date(originalTimesheet.week_start_date);
  const newWeekDate = new Date(originalWeekDate);
  newWeekDate.setDate(newWeekDate.getDate() - 7);
  // 4. Update the timesheet with new week_start_date
  const updatedTimesheet: IHrmPlatformTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      memberConnection,
      {
        timesheetId: originalTimesheet.id,
        body: {
          week_start_date: newWeekDate.toISOString(),
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(updatedTimesheet);
  // 5. Validate the updated timesheet
  TestValidator.equals(
    "week_start_date updated",
    updatedTimesheet.week_start_date,
    newWeekDate.toISOString(),
  );
  TestValidator.equals(
    "timesheet id unchanged",
    updatedTimesheet.id,
    originalTimesheet.id,
  );
  TestValidator.equals(
    "status remains draft",
    updatedTimesheet.status,
    "draft",
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedTimesheet.updated_at) >=
      new Date(updatedTimesheet.created_at),
  );
  TestValidator.predicate(
    "total_hours is non-negative",
    updatedTimesheet.total_hours >= 0,
  );
}
