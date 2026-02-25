import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardMaintenanceScheduleCollector {
  export async function collect(props: {
    body: IDiscussionBoardMaintenanceSchedule.ICreate;
    discussionBoardAdmins: IEntity; // from authorized actor
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      maintenance_type: props.body.maintenance_type,
      description: props.body.description,
      scheduled_start_time: new Date(props.body.scheduled_start_time),
      scheduled_end_time: new Date(props.body.scheduled_end_time),
      actual_start_time: null,
      actual_end_time: null,
      status: props.body.status,
      estimated_duration_minutes: props.body.estimated_duration_minutes,
      actual_duration_minutes: null,
      impact_level: props.body.impact_level,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      scheduledByAdmin: { connect: { id: props.discussionBoardAdmins.id } },
      performedByAdmin: undefined,
    } satisfies Prisma.discussion_board_maintenance_schedulesCreateInput;
  }
}
