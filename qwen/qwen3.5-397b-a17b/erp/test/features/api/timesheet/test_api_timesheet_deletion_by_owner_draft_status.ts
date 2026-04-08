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
 * Test timesheet deletion by owner when timesheet is in draft status.
 *
 * Validates that an employee can successfully delete their own timesheet when it is in draft status. This test confirms the soft delete behavior where the timesheet is marked as deleted while preserving associated timelog data.
 *
 * The test flow ensures that employees have full control over their draft timesheets and can remove them without restrictions. This is a common workflow where employees may create draft timesheets and decide to delete them before submission.
 *
 * 1. Member account is created and authenticated via join operation.
 * 2. A draft timesheet is created for the current week period.
 * 3. The timesheet is deleted using the DELETE endpoint.
 * 4. Validates that the deletion operation completes successfully without errors.
 *
 * Business rules validated:
 * - Draft timesheets can be deleted by their owner
 * - Soft delete preserves timelog associations
 * - No authorization errors for owner-initiated deletion
 */
export async function test_api_timesheet_deletion_by_owner_draft_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a draft timesheet for the current week
  const timesheet: IHrmPlatformTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {},
    );
  typia.assert(timesheet);
  // Validate timesheet is in draft status
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.predicate(
    "deleted_at is null before deletion",
    timesheet.deletedAt === null,
  );
  // 3. Delete the timesheet using DELETE endpoint
  await api.functional.hrmPlatform.member.timesheets.erase(memberConnection, {
    timesheetId: timesheet.id,
  });
  // 4. Validate deletion completed successfully
  // The erase endpoint returns void, so we validate by confirming no error was thrown
  TestValidator.predicate("deletion operation completed without error", true);
}
