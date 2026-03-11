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
    statusType: IEntity; // Required parameter for status type relation
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      maintenance_type: props.body.maintenance_type,
      title: props.body.title,
      description: props.body.description ?? null,
      planned_start_at: new Date(props.body.planned_start_at),
      planned_end_at: new Date(props.body.planned_end_at),
      actual_start_at: null,
      actual_end_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      statusType: { connect: { id: props.statusType.id } },
    } satisfies Prisma.discussion_board_maintenance_schedulesCreateInput;
  }
}
