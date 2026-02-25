import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";

export namespace DiscussionBoardMaintenanceScheduleTransformer {
  export type Payload = Prisma.discussion_board_maintenance_schedulesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        maintenance_type: true,
        description: true,
        scheduled_start_time: true,
        scheduled_end_time: true,
        actual_start_time: true,
        actual_end_time: true,
        status: true,
        estimated_duration_minutes: true,
        actual_duration_minutes: true,
        impact_level: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        scheduledByAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
        performedByAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_maintenance_schedulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMaintenanceSchedule> {
    return {
      id: input.id,
      maintenance_type: input.maintenance_type,
      description: input.description,
      scheduled_start_time: input.scheduled_start_time.toISOString(),
      scheduled_end_time: input.scheduled_end_time.toISOString(),
      actual_start_time: input.actual_start_time?.toISOString() ?? null,
      actual_end_time: input.actual_end_time?.toISOString() ?? null,
      status: input.status,
      estimated_duration_minutes: input.estimated_duration_minutes,
      actual_duration_minutes: input.actual_duration_minutes ?? null,
      impact_level: input.impact_level,
      notes: input.notes ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      scheduled_by_admin:
        await DiscussionBoardAdminAtSummaryTransformer.transform(
          input.scheduledByAdmin,
        ),
      performed_by_admin: input.performedByAdmin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.performedByAdmin,
          )
        : undefined,
    };
  }
}
