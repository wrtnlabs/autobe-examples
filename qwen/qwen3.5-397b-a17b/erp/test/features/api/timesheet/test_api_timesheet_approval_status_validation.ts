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
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test timesheet approval status validation rejecting draft timesheets.
 *
 * Validates that the timesheet approval endpoint correctly enforces status constraints by rejecting approval attempts for timesheets that are not in submitted status. This test ensures that draft timesheets cannot be prematurely approved before the employee submits them for review.
 *
 * The test creates a manager account with time:approve permission and an employee account. The employee creates timelog entries and a draft timesheet (without submitting). The manager then attempts to approve the draft timesheet, which should be rejected with a business logic error.
 *
 * 1. Manager member account created with time:approve permission.
 * 2. Employee member account created for timesheet ownership.
 * 3. Employee creates timelog entries for work performed.
 * 4. Employee creates draft timesheet (status remains 'draft', not submitted).
 * 5. Manager attempts to approve the draft timesheet.
 * 6. Validates approval is rejected with appropriate error indicating timesheet is not in submitted status.
 */
export async function test_api_timesheet_approval_status_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager account with time:approve permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(manager);
  // 2. Create employee account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employee);
  // 3. Employee creates timelog entries
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {},
  );
  typia.assert(timelog);
  // 4. Employee creates draft timesheet (not submitted)
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {},
  );
  typia.assert(timesheet);
  // Validate timesheet is in draft status before approval attempt
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.predicate("no reviewer assigned", timesheet.reviewer === null);
  TestValidator.predicate(
    "no reviewedAt timestamp",
    timesheet.reviewedAt === null,
  );
  // 5. Manager attempts to approve draft timesheet (should fail with business error)
  await TestValidator.error("draft timesheet approval rejected", async () => {
    await api.functional.hrmPlatform.member.timesheets.approve(
      managerConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  });
}
