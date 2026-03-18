import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingTaskAtSummaryTransformer } from "./HrmTimeTrackingTaskAtSummaryTransformer";

export namespace HrmTimeTrackingTaskHistoryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTaskHistory> {
    return {
      id: input.id,
      task: await HrmTimeTrackingTaskAtSummaryTransformer.transform(input.task),
      actor_type: input.actor_type,
      old_status: input.old_status,
      new_status: input.new_status,
      changed_at: input.changed_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        task: HrmTimeTrackingTaskAtSummaryTransformer.select(),
        actor_type: true,
        old_status: true,
        new_status: true,
        changed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_task_historiesFindManyArgs;
  }
  export type Payload = Prisma.hrm_time_tracking_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
}
