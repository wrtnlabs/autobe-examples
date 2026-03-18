import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingTimesheetAtSummaryTransformer } from "./HrmTimeTrackingTimesheetAtSummaryTransformer";

export namespace HrmTimeTrackingTimesheetSnapshotTransformer {
  export type Payload = Prisma.hrm_time_tracking_timesheet_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        timesheet: HrmTimeTrackingTimesheetAtSummaryTransformer.select(),
        locked: true,
      },
    } satisfies Prisma.hrm_time_tracking_timesheet_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTimesheetSnapshot> {
    return {
      id: input.id,
      timesheet: await HrmTimeTrackingTimesheetAtSummaryTransformer.transform(
        input.timesheet,
      ),
      locked: input.locked,
    };
  }
}
