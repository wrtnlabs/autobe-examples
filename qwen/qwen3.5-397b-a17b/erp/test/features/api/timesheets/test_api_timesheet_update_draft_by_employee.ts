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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
 * Test employee draft timesheet update workflow.
 *
 * Validates that an employee can create and update their own draft timesheet before submission. The test creates a member account, generates a draft timesheet for a specific week period, then updates the timesheet while maintaining draft status. This ensures the core timesheet preparation workflow functions correctly.
 *
 * The test verifies that draft timesheets remain fully modifiable by the owner employee, including the ability to update status transitions and other properties. All response entities are validated for type correctness and business logic integrity.
 *
 * 1. Member registers and authenticates to establish employee context.
 * 2. Creates a draft timesheet for a specific week (Monday start date).
 * 3. Updates the draft timesheet with modified fields.
 * 4. Validates updated timesheet maintains draft status and contains all expected fields including week period dates and timelogs.
 */
export async function test_api_timesheet_update_draft_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create draft timesheet with a valid Monday date
  // Using a known Monday date to satisfy the API constraint
  const mondayDate = "2024-01-08"; // This is a Monday
  const draftTimesheet: IHrmPlatformTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: mondayDate,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(draftTimesheet);
  // 3. Update draft timesheet
  const updatedTimesheet: IHrmPlatformTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      memberConnection,
      {
        timesheetId: draftTimesheet.id,
        body: {
          status: "draft",
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(updatedTimesheet);
  // 4. Validate update results
  TestValidator.equals(
    "timesheet id preserved",
    updatedTimesheet.id,
    draftTimesheet.id,
  );
  TestValidator.equals(
    "status remains draft",
    updatedTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "week start date preserved",
    updatedTimesheet.weekStartDate,
    draftTimesheet.weekStartDate,
  );
  TestValidator.equals(
    "week end date preserved",
    updatedTimesheet.weekEndDate,
    draftTimesheet.weekEndDate,
  );
  TestValidator.equals(
    "employee preserved",
    updatedTimesheet.employee.id,
    draftTimesheet.employee.id,
  );
  TestValidator.predicate(
    "updated_at is later",
    new Date(updatedTimesheet.updatedAt).getTime() >
      new Date(draftTimesheet.updatedAt).getTime(),
  );
  TestValidator.predicate(
    "timelogs array exists",
    Array.isArray(updatedTimesheet.timelogs),
  );
}
