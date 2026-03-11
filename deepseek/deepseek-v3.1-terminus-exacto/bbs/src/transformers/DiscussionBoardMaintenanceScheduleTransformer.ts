import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardStatusTypeAtSummaryTransformer } from "./DiscussionBoardStatusTypeAtSummaryTransformer";

export namespace DiscussionBoardMaintenanceScheduleTransformer {
  export type Payload = Prisma.discussion_board_maintenance_schedulesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        maintenance_type: true,
        title: true,
        description: true,
        planned_start_at: true,
        planned_end_at: true,
        actual_start_at: true,
        actual_end_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        statusType: DiscussionBoardStatusTypeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_maintenance_schedulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMaintenanceSchedule> {
    return {
      id: input.id,
      maintenance_type: input.maintenance_type,
      title: input.title,
      description: input.description ?? null,
      planned_start_at: input.planned_start_at.toISOString(),
      planned_end_at: input.planned_end_at.toISOString(),
      actual_start_at: input.actual_start_at?.toISOString() ?? null,
      actual_end_at: input.actual_end_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      statusType: await DiscussionBoardStatusTypeAtSummaryTransformer.transform(
        input.statusType,
      ),
    };
  }
}
