import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_maintenance_schedules_create } from "../../../generate/generate_random_discussion_board_admin_maintenance_schedules_create";
import { prepare_random_discussion_board_maintenance_schedule } from "../../../prepare/prepare_random_discussion_board_maintenance_schedule";

/**
 * Test creation of a high-impact critical security patch maintenance window.
 * Administrator schedules urgent security patching to demonstrate the maintenance
 * scheduling workflow with critical impact assessment and proper timing validation.
 */
export async function test_api_maintenance_schedule_creation_critical_security_patch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  // Use direct SDK call since authorize_admin_join utility function is not available in imports
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: "admin.security@example.com",
        password: "AdminPass123!",
        display_name: "Security Administrator",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/admin",
        ip: "192.168.1.1",
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Update connection headers with authorization token
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2. Calculate maintenance window timing
  const scheduledStartTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
  const scheduledEndTime = new Date(
    scheduledStartTime.getTime() + 60 * 60 * 1000,
  ); // 1 hour later
  const estimatedDurationMinutes = 60;
  // 3. Create critical security patch maintenance schedule
  const schedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.create(
      adminConnection,
      {
        body: {
          maintenance_type: "security_patch",
          description:
            "Critical security patch deployment to address CVE-2024-1234 vulnerability affecting authentication systems",
          scheduled_start_time: scheduledStartTime.toISOString(),
          scheduled_end_time: scheduledEndTime.toISOString(),
          estimated_duration_minutes:
            estimatedDurationMinutes satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> as number,
          impact_level: "critical",
          status: "scheduled",
          notes:
            "Affected services: Authentication API, User management service, Session handling",
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(schedule);
  // 4. Validate critical impact level
  if (schedule.impact_level !== "critical") {
    throw new Error(
      `Expected impact level to be 'critical' but got '${schedule.impact_level}'`,
    );
  }
  // 5. Validate timing constraints
  const actualDurationMinutes = Math.round(
    (new Date(schedule.scheduled_end_time).getTime() -
      new Date(schedule.scheduled_start_time).getTime()) /
      (60 * 1000),
  );
  if (schedule.estimated_duration_minutes !== actualDurationMinutes) {
    throw new Error(
      `Estimated duration ${schedule.estimated_duration_minutes} minutes does not match calculated duration ${actualDurationMinutes} minutes`,
    );
  }
  // 6. Validate scheduled end time is after start time
  if (
    !(
      new Date(schedule.scheduled_end_time) >
      new Date(schedule.scheduled_start_time)
    )
  ) {
    throw new Error(`Scheduled end time must be after start time`);
  }
  // 7. Validate status defaults correctly
  if (schedule.status !== "scheduled") {
    throw new Error(
      `Expected status to be 'scheduled' but got '${schedule.status}'`,
    );
  }
  // 8. Validate administrator relationship
  if (!schedule.scheduled_by_admin) {
    throw new Error(`scheduled_by_admin relationship must be established`);
  }
  if (!schedule.scheduled_by_admin.id) {
    throw new Error(`scheduled_by_admin must have valid ID`);
  }
  if (!schedule.scheduled_by_admin.email) {
    throw new Error(`scheduled_by_admin must have email`);
  }
}
