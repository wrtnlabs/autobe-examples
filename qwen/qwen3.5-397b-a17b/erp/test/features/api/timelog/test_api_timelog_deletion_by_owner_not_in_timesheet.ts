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
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test timelog deletion by owner when timelog is not part of any timesheet.
 *
 * Validates that an employee can successfully delete their own timelog entry when it has not been assigned to any timesheet. This test ensures the deletion workflow works correctly for timelogs that are in a "free" state (not yet included in a weekly timesheet submission).
 *
 * The test creates a member account, generates a timelog with valid project assignment, confirms the timelog is not part of any timesheet (timesheet field is null), then performs the deletion operation. The deletion should succeed with no errors since the timelog owner is performing the deletion and the timelog is not locked by any timesheet.
 *
 * 1. Member authenticates via join operation to obtain valid credentials.
 * 2. Creates a timelog entry with random valid data including date, duration, and project reference.
 * 3. Verifies the timelog exists and has timesheet field as null (not assigned to any timesheet).
 * 4. Calls DELETE endpoint to remove the timelog.
 * 5. Validates the deletion completes successfully without throwing errors.
 */
export async function test_api_timelog_deletion_by_owner_not_in_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a timelog entry
  const timelog: IHrmPlatformTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          billable: true,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          hrm_platform_project_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  // 3. Verify timelog exists and is not part of any timesheet
  TestValidator.predicate(
    "timelog should not be in any timesheet",
    timelog.timesheet === null || timelog.timesheet === undefined,
  );
  // 4. Delete the timelog (204 No Content on success)
  await api.functional.hrmPlatform.member.timelogs.erase(memberConnection, {
    timelogId: timelog.id,
  });
  // Deletion succeeded - no error thrown indicates 204 No Content response
}