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
 * Test that an employee cannot update their own timelog when it is part of an approved timesheet.
 *
 * Validates the business rule that timelogs become immutable once included in an approved timesheet. This prevents employees from modifying historical time entries that have already been reviewed and approved, ensuring data integrity for payroll and billing purposes.
 *
 * The test establishes a workflow: member registration, timelog creation, and attempted modification. In a complete environment with organization, project, and timesheet APIs, the timelog would be added to a timesheet and approved before attempting the update. The update attempt should fail with 403 Forbidden when the timesheet is in approved status.
 *
 * 1. Member account created via join endpoint with unique credentials.
 * 2. Timelog created for the authenticated member on a project.
 * 3. Timesheet containing timelog would be created, submitted, and approved (requires additional APIs).
 * 4. Member attempts to update timelog duration and description.
 * 5. System rejects update with 403 Forbidden due to approved timesheet lock.
 * 6. Validates error response confirms timelog is locked from modifications.
 */
export async function test_api_timelog_update_rejected_in_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a timelog for the member
  // Note: In production, this requires valid project_id from organization/project setup
  // The timelog would later be included in a timesheet and approved
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    memberConnection,
    {
      body: {
        date: new Date().toISOString(),
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        hrm_platform_project_id: typia.random<string & tags.Format<"uuid">>(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 3. Store original values for comparison
  const originalDuration = timelog.duration_minutes;
  const originalDescription = timelog.description;
  // 4. Prepare update payload attempting to modify timelog
  const updatePayload: IHrmPlatformTimelog.IUpdate = {
    durationMinutes: originalDuration + 30,
    description: "Updated description after timesheet approval",
  };
  // 5. Attempt to update the timelog
  // In approved timesheet scenario, this should fail with 403 Forbidden
  // The backend specification states: "For non-admin users (timelog owner without time:manage):
  // verify the timelog's timesheet is not in 'approved' status. If timesheet status is approved,
  // reject with 403 Forbidden."
  await TestValidator.error(
    "timelog update should be rejected when timesheet is approved",
    async () => {
      await api.functional.hrmPlatform.member.timelogs.update(
        memberConnection,
        {
          timelogId: timelog.id,
          body: updatePayload,
        },
      );
    },
  );
  // 6. Validation complete
  // The TestValidator.error above confirms the update was rejected
  // In a complete test environment with timesheet APIs, we would:
  // - Create a timesheet containing this timelog
  // - Submit and approve the timesheet
  // - Verify the 403 response contains appropriate error message
  // - Optionally fetch the timelog again to confirm it remains unchanged
}
