import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardStatusTypeAtSummaryTransformer } from "./DiscussionBoardStatusTypeAtSummaryTransformer";

export namespace DiscussionBoardMaintenanceScheduleAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_maintenance_schedulesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        maintenance_type: true,
        planned_start_at: true,
        planned_end_at: true,
        statusType: DiscussionBoardStatusTypeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_maintenance_schedulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMaintenanceSchedule.ISummary> {
    return {
      id: input.id,
      title: input.title,
      maintenance_type: input.maintenance_type,
      planned_start_at: input.planned_start_at.toISOString(),
      planned_end_at: input.planned_end_at.toISOString(),
      statusType: await DiscussionBoardStatusTypeAtSummaryTransformer.transform(
        input.statusType,
      ),
    };
  }
}
