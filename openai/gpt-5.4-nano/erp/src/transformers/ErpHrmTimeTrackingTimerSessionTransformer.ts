import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimerSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingTimerSessionTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_timer_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        description: true,
        started_at: true,
        ended_at: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // FK ids are scalar columns; relation selects are omitted because DTO needs only scalar ids.
        // However, neighbor reuse is not required for this DTO.
        organization_id: true,
        employee_id: true,
        project_id: true,
        task_id: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_timer_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingTimerSession> {
    return {
      id: input.id,
      organization_id: input.organization_id,
      employee_id: input.employee_id,
      project_id: input.project_id,
      task_id: input.task_id ?? null,
      description: input.description,
      started_at: input.started_at.toISOString(),
      ended_at: input.ended_at ? input.ended_at.toISOString() : null,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
