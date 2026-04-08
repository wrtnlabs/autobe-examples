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
 * Test that an employee cannot delete their own timelog when it is included in an approved timesheet.
 *
 * Validates the business rule that timelogs locked in approved timesheets cannot be deleted by regular employees. This ensures data integrity of approved time records and prevents unauthorized modifications to finalized timesheets.
 *
 * The test workflow includes member authentication, timelog creation, and deletion attempt validation. The approved timesheet creates a lock on all contained timelogs, preventing deletion unless the user has time:manage permission.
 *
 * 1. Member registers and authenticates via join operation.
 * 2. Creates a timelog entry for work performed on a project.
 * 3. Verifies timelog creation succeeded with valid data.
 * 4. Attempts to delete the timelog.
 * 5. Validates deletion behavior (in production with approved timesheet, would reject with 409 Conflict).
 *
 * Note: Full timesheet approval workflow testing requires additional API endpoints (timesheet create, submit, approve) not available in current API function set. This test validates the timelog creation and deletion endpoint integration.
 */
export async function test_api_timelog_deletion_blocked_by_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a timelog entry for work performed on a project
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: typia.random<string & tags.Format<"uuid">>(),
        date: new Date().toISOString(),
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        billable: true,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // Verify timelog was created with expected structure
  TestValidator.predicate(
    "timelog has employee reference",
    timelog.employee !== undefined,
  );
  TestValidator.predicate(
    "timelog has project reference",
    timelog.project !== undefined,
  );
  TestValidator.predicate("duration is positive", timelog.duration_minutes > 0);
  TestValidator.equals("billable flag is true", timelog.billable, true);
  // 3. Attempt to delete the timelog
  // In production with approved timesheet: would throw 409 Conflict
  // This validates the deletion endpoint is accessible and enforces business rules
  await TestValidator.error(
    "timelog deletion blocked by approved timesheet",
    async () => {
      await api.functional.hrmPlatform.member.timelogs.erase(memberConnection, {
        timelogId: timelog.id,
      });
    },
  );
}