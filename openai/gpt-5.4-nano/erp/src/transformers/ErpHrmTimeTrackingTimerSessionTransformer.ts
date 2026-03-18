import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimerSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        organization: {
          select: { id: true },
        },
        employee: {
          select: { id: true },
        },
        project: {
          select: { id: true },
        },
        task: {
          select: { id: true },
        },
      },
    } satisfies Prisma.erp_hrm_time_tracking_timer_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingTimerSession> {
    return {
      id: input.id,
      organization_id: input.organization.id,
      employee_id: input.employee.id,
      project_id: input.project.id,
      task_id: input.task ? input.task.id : null,
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
