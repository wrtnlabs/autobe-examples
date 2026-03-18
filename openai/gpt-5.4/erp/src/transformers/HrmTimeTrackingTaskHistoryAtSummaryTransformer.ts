import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackingTaskHistoryAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        old_status: true,
        new_status: true,
        changed_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_task_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTaskHistory.ISummary> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      old_status: input.old_status,
      new_status: input.new_status,
      changed_at: input.changed_at.toISOString(),
    };
  }
}
