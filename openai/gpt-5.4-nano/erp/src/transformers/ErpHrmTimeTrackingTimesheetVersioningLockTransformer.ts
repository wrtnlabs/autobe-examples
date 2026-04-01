import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheetVersioningLock } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheetVersioningLock";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingTimesheetVersioningLockTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_timesheet_versioning_locksGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        // Use scalar timesheet_id; relation isn't required by DTO.
        timesheet_id: true,
        locked_by_user_id: true,
        lock_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_timesheet_versioning_locksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingTimesheetVersioningLock> {
    return {
      id: input.id,
      timesheet_id: input.timesheet_id,
      locked_by_user_id: input.locked_by_user_id,
      lock_reason: input.lock_reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
