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

/**
 * Test updating a draft timesheet's week period.
 * 1. Member registers and authenticates
 * 2. Create a draft timesheet for week 1 (Monday to Sunday)
 * 3. Update the timesheet to a different week period
 * 4. Validate week_start_date, week_end_date, and updated_at are updated correctly
 * 5. Verify the complete timesheet entity is returned with employee details and timelogs
 */
export async function test_api_timesheet_update_draft_week_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Create initial draft timesheet for week 1
  // Week 1: 2024-01-01 (Monday) to 2024-01-07 (Sunday)
  const week1Start = "2024-01-01";
  const week1End = "2024-01-07";
  const initialTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: week1Start,
          week_end_date: week1End,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(initialTimesheet);
  TestValidator.equals(
    "initial status is draft",
    initialTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "initial week_start_date",
    initialTimesheet.week_start_date,
    week1Start,
  );
  TestValidator.equals(
    "initial week_end_date",
    initialTimesheet.week_end_date,
    week1End,
  );
  // 3. Update timesheet to week 2
  // Week 2: 2024-01-08 (Monday) to 2024-01-14 (Sunday)
  const week2Start = "2024-01-08";
  const week2End = "2024-01-14";
  const updateBody = {
    week_start_date: week2Start,
    week_end_date: week2End,
  } satisfies IHrmPlatformTimesheet.IUpdate;
  const updatedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      memberConnection,
      {
        timesheetId: initialTimesheet.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTimesheet);
  // 4. Validate updated timesheet
  TestValidator.equals(
    "week_start_date updated",
    updatedTimesheet.week_start_date,
    week2Start,
  );
  TestValidator.equals(
    "week_end_date updated",
    updatedTimesheet.week_end_date,
    week2End,
  );
  TestValidator.equals(
    "status remains draft",
    updatedTimesheet.status,
    "draft",
  );
  TestValidator.notEquals(
    "updated_at changed",
    initialTimesheet.updated_at,
    updatedTimesheet.updated_at,
  );
  TestValidator.equals(
    "timesheet id unchanged",
    updatedTimesheet.id,
    initialTimesheet.id,
  );
  TestValidator.equals(
    "employee_id unchanged",
    updatedTimesheet.employee_id,
    initialTimesheet.employee_id,
  );
  // 5. Validate employee details are present
  TestValidator.predicate(
    "employee exists",
    updatedTimesheet.employee !== null,
  );
  TestValidator.equals(
    "employee id matches",
    updatedTimesheet.employee.id,
    initialTimesheet.employee.id,
  );
  // 6. Validate timelogs are associated
  TestValidator.predicate(
    "timelogs array exists",
    Array.isArray(updatedTimesheet.timelogs),
  );
  // 7. Test unique constraint - attempt to create another timesheet for the same week
  await TestValidator.error("duplicate week constraint", async () => {
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: week2Start,
          week_end_date: week2End,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  });
}
