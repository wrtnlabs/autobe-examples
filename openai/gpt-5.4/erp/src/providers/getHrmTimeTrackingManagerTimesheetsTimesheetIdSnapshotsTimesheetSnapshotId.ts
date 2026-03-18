import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { HrmTimeTrackingTimesheetSnapshotTransformer } from "../transformers/HrmTimeTrackingTimesheetSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingManagerTimesheetsTimesheetIdSnapshotsTimesheetSnapshotId(props: {
  manager: ManagerPayload;
  timesheetId: string & tags.Format<"uuid">;
  timesheetSnapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTimesheetSnapshot> {
  await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const snapshot =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.timesheetSnapshotId,
          hrm_time_tracking_timesheet_id: props.timesheetId,
        },
        ...HrmTimeTrackingTimesheetSnapshotTransformer.select(),
      },
    );
  return await HrmTimeTrackingTimesheetSnapshotTransformer.transform(snapshot);
}
