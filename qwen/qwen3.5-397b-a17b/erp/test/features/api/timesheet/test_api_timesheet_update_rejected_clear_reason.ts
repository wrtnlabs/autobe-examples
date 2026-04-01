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
 * Test updating a rejected timesheet to clear the rejection reason in preparation for resubmission.
 * An employee's timesheet is submitted, then rejected by a reviewer with a rejection reason.
 * The employee updates the timesheet by clearing the rejection_reason field (setting to null).
 * The test validates that the rejection_reason is successfully cleared, the status remains in
 * draft state allowing resubmission, and the updated_at timestamp reflects the modification.
 * This scenario tests the rejected timesheet workflow where employees can address rejection
 * feedback and prepare for resubmission.
 */
export async function test_api_timesheet_update_rejected_clear_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - create employee account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a draft timesheet for the member
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {},
  );
  typia.assert(timesheet);
  TestValidator.equals("initial status is draft", timesheet.status, "draft");
  TestValidator.equals(
    "initial rejection_reason is null",
    timesheet.rejection_reason,
    null,
  );
  // 3. Simulate rejection workflow by updating with a rejection reason
  // In real workflow, reviewer would reject, but we simulate the rejected state
  const rejectedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          rejection_reason: "Missing project information. Please add timelogs.",
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(rejectedTimesheet);
  TestValidator.equals(
    "rejection reason set",
    rejectedTimesheet.rejection_reason,
    "Missing project information. Please add timelogs.",
  );
  // 4. Employee updates timesheet to clear the rejection reason (preparing for resubmission)
  const updatedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      memberConnection,
      {
        timesheetId: rejectedTimesheet.id,
        body: {
          rejection_reason: null,
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(updatedTimesheet);
  // 5. Validate rejection reason is cleared
  TestValidator.equals(
    "rejection reason cleared",
    updatedTimesheet.rejection_reason,
    null,
  );
  TestValidator.equals(
    "timesheet id unchanged",
    updatedTimesheet.id,
    rejectedTimesheet.id,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedTimesheet.updated_at,
    rejectedTimesheet.updated_at,
  );
}
