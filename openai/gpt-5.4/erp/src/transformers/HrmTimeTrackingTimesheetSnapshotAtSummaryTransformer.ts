import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackingTimesheetSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_timesheet_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        locked: true,
      },
    } satisfies Prisma.hrm_time_tracking_timesheet_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTimesheetSnapshot.ISummary> {
    return {
      id: input.id,
      locked: input.locked,
    };
  }
}
