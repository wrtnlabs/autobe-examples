import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackingActivityLogAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        action_type: true,
        target_entity: true,
        target_entity_id: true,
        details: true,
        created_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingActivityLog.ISummary> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      action_type: input.action_type,
      target_entity: input.target_entity,
      target_entity_id: input.target_entity_id ?? null,
      details: input.details ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
