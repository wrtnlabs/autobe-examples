import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { IHrmTimeTrackTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheetSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimesheetSnapshotTransformer } from "../transformers/HrmTimeTrackTimesheetSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberTimesheetsTimesheetIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackTimesheetSnapshot> {
  const record =
    await MyGlobal.prisma.hrm_time_track_timesheet_snapshots.findFirstOrThrow({
      ...HrmTimeTrackTimesheetSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        hrm_time_track_timesheet_id: props.timesheetId,
      },
    });
  return await HrmTimeTrackTimesheetSnapshotTransformer.transform(record);
}
