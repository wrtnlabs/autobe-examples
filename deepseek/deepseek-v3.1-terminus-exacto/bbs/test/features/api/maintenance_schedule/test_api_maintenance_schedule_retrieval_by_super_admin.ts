import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can successfully retrieve detailed maintenance schedule information.
 * Validates that all maintenance schedule fields are returned correctly including scheduling details,
 * admin assignments, timing information (both planned and actual), status, impact level, and notes.
 */
export async function test_api_maintenance_schedule_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate random schedule ID
  const scheduleId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve maintenance schedule
  const maintenanceSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.at(
      superAdminConnection,
      { scheduleId },
    );
  // Validate complete response structure - typia.assert performs ALL validation
  typia.assert(maintenanceSchedule);
  // Verify ID matching (business logic validation)
  TestValidator.equals(
    "schedule ID matches",
    maintenanceSchedule.id,
    scheduleId,
  );
  // Verify estimated duration is positive (business constraint)
  TestValidator.predicate(
    "estimated duration is positive",
    maintenanceSchedule.estimated_duration_minutes > 0,
  );
  // Verify admin relationships exist (business logic)
  TestValidator.predicate(
    "scheduled by admin exists",
    maintenanceSchedule.scheduled_by_admin !== undefined,
  );
  // Verify optional fields with proper null checks
  if (maintenanceSchedule.actual_duration_minutes !== null) {
    TestValidator.predicate(
      "actual duration is positive when present",
      maintenanceSchedule.actual_duration_minutes > 0,
    );
  }
  if (maintenanceSchedule.performed_by_admin !== null) {
    TestValidator.predicate(
      "performed admin exists when present",
      maintenanceSchedule.performed_by_admin !== undefined,
    );
  }
}
