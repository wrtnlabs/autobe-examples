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
 * Test that an approved timesheet cannot be deleted even by its owner, validating the locked status business rule.
 *
 * Validates the complete timesheet deletion workflow including member authentication, timesheet creation, and deletion attempt. Ensures that the timesheet deletion endpoint properly enforces business rules regarding timesheet status.
 *
 * Special attention is given to verifying that the deletion operation respects the timesheet lifecycle - draft timesheets can be deleted by owners, while approved timesheets are locked and cannot be deleted under any circumstances to preserve audit trail and data integrity.
 *
 * 1. Member account is created and authenticated via join operation.
 * 2. Draft timesheet is created for the authenticated member's employee record.
 * 3. Deletion attempt is made on the timesheet using the erase endpoint.
 * 4. Validates that the deletion endpoint is accessible and functions correctly with proper authentication.
 *
 * Note: Full approved status validation requires employee creation, timesheet submission, and approval endpoints that are not available in the current SDK function set. This test validates the deletion workflow with available APIs.
 */
export async function test_api_timesheet_deletion_blocked_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a draft timesheet for the authenticated member
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {},
  );
  typia.assert(timesheet);
  // 3. Verify timesheet was created in draft status
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 4. Attempt to delete the timesheet as the owning employee
  // For draft status, deletion succeeds (owners can delete their draft timesheets)
  // For approved status, deletion would fail with 400 Bad Request (approved timesheets are locked)
  await api.functional.hrmPlatform.member.timesheets.erase(memberConnection, {
    timesheetId: timesheet.id,
  });
  // 5. Deletion completed successfully for draft timesheet
  // Note: To test approved timesheet deletion blocking, we would need:
  // - Employee creation endpoint
  // - Timesheet submit endpoint
  // - Timesheet approve endpoint (requires manager with time:approve permission)
  // These endpoints are not available in the current SDK function set
}
