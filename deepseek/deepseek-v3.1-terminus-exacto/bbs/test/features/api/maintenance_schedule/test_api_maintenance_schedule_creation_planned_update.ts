import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { prepare_random_discussion_board_maintenance_schedule } from "../../../prepare/prepare_random_discussion_board_maintenance_schedule";
import { generate_random_discussion_board_admin_maintenance_schedules_create } from "../../../generate/generate_random_discussion_board_admin_maintenance_schedules_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_maintenance_schedule_creation_planned_update(connection: api.IConnection): Promise<void> {
    // Create admin connection and authenticate
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardAdmin.IJoin,
    });
    typia.assert(admin);
    
    // Create maintenance schedule data aligned with off-peak hours (morning)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Schedule for tomorrow
    const startTime = new Date(tomorrow);
    startTime.setHours(2, 0, 0, 0); // 2 AM tomorrow
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
    const estimatedDuration = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));
    
    const maintenanceBody = {
        maintenance_type: "system_update",
        description: RandomGenerator.content({ paragraphs: 1, sentenceMin: 2, sentenceMax: 4 }),
        scheduled_start_time: startTime.toISOString(),
        scheduled_end_time: endTime.toISOString(),
        estimated_duration_minutes: estimatedDuration,
        impact_level: "medium",
        status: "scheduled",
        notes: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IDiscussionBoardMaintenanceSchedule.ICreate;
    
    // Create maintenance schedule using utility function
    const maintenance = await generate_random_discussion_board_admin_maintenance_schedules_create(adminConnection, { body: maintenanceBody });
    typia.assert(maintenance);
    
    // Validate business logic only (no type validation after typia.assert)
    TestValidator.equals("admin matches scheduled by admin", maintenance.scheduled_by_admin.id, admin.id);
    TestValidator.equals("notes match", maintenance.notes, maintenanceBody.notes);
    TestValidator.predicate("future maintenance window", () => new Date(maintenance.scheduled_start_time) > now);
    TestValidator.equals("performed_by_admin is null before maintenance", maintenance.performed_by_admin, null);
}