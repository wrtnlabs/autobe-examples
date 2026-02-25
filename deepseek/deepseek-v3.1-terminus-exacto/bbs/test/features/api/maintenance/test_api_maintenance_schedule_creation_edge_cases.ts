import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_super_admin_maintenance_schedules_create } from "../../../generate/generate_random_discussion_board_super_admin_maintenance_schedules_create";
import { prepare_random_discussion_board_maintenance_schedule } from "../../../prepare/prepare_random_discussion_board_maintenance_schedule";

export async function test_api_maintenance_schedule_creation_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create and authorize super admin
  const joinConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Create fresh connection with authorization token
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorizedSuperAdmin.token.access}` },
  };
  // Test 1: Minimal description with system update and null notes
  const startTime1 = new Date(Date.now() + 3600000).toISOString();
  const endTime1 = new Date(Date.now() + 7200000).toISOString();
  const duration1 = Math.floor(
    (new Date(endTime1).getTime() - new Date(startTime1).getTime()) / 60000,
  );
  const schedule1 =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system update",
          description: "A", // Minimal description
          scheduled_start_time: startTime1,
          scheduled_end_time: endTime1,
          estimated_duration_minutes: duration1,
          impact_level: "low",
          status: "scheduled",
          notes: undefined,
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(schedule1);
  TestValidator.equals(
    "minimal description schedule created",
    schedule1.description,
    "A",
  );
  TestValidator.equals(
    "system update type",
    schedule1.maintenance_type,
    "system update",
  );
  TestValidator.equals("low impact level", schedule1.impact_level, "low");
  TestValidator.equals("scheduled status", schedule1.status, "scheduled");
  TestValidator.equals("notes is null", schedule1.notes, null);
  TestValidator.equals(
    "duration matches calculated",
    schedule1.estimated_duration_minutes,
    duration1,
  );
  // Test 2: Detailed description with database backup and detailed notes
  const startTime2 = new Date(Date.now() + 86400000).toISOString();
  const endTime2 = new Date(Date.now() + 90000000).toISOString();
  const duration2 = Math.floor(
    (new Date(endTime2).getTime() - new Date(startTime2).getTime()) / 60000,
  );
  const schedule2 =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "database backup",
          description: RandomGenerator.paragraph({ sentences: 5 }), // Detailed description
          scheduled_start_time: startTime2,
          scheduled_end_time: endTime2,
          estimated_duration_minutes: duration2,
          impact_level: "medium",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 3 }), // Detailed notes
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(schedule2);
  TestValidator.predicate(
    "detailed description exists",
    schedule2.description.length > 10,
  );
  TestValidator.equals(
    "database backup type",
    schedule2.maintenance_type,
    "database backup",
  );
  TestValidator.equals("medium impact level", schedule2.impact_level, "medium");
  TestValidator.predicate(
    "notes exists",
    schedule2.notes !== null && schedule2.notes!.length > 0,
  );
  TestValidator.equals(
    "duration matches calculated",
    schedule2.estimated_duration_minutes,
    duration2,
  );
  // Test 3: Security patch with high impact and undefined notes
  const startTime3 = new Date(Date.now() + 172800000).toISOString();
  const endTime3 = new Date(Date.now() + 173400000).toISOString();
  const duration3 = Math.floor(
    (new Date(endTime3).getTime() - new Date(startTime3).getTime()) / 60000,
  );
  const schedule3 =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "security patch",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          scheduled_start_time: startTime3,
          scheduled_end_time: endTime3,
          estimated_duration_minutes: duration3,
          impact_level: "high",
          status: "scheduled",
          // notes intentionally omitted to test undefined
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(schedule3);
  TestValidator.equals(
    "security patch type",
    schedule3.maintenance_type,
    "security patch",
  );
  TestValidator.equals("high impact level", schedule3.impact_level, "high");
  TestValidator.equals("notes is undefined", schedule3.notes, undefined);
  TestValidator.equals(
    "duration matches calculated",
    schedule3.estimated_duration_minutes,
    duration3,
  );
  // Test 4: Verify scheduled_by_admin matches authenticated super admin
  TestValidator.equals(
    "scheduled by admin exists",
    typeof schedule1.scheduled_by_admin,
    "object",
  );
  TestValidator.equals(
    "scheduled by admin has id",
    typeof schedule1.scheduled_by_admin.id,
    "string",
  );
  TestValidator.equals(
    "scheduled by admin has email",
    typeof schedule1.scheduled_by_admin.email,
    "string",
  );
}