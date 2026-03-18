import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheetSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { HrmTimeTrackingTimesheetSnapshotAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimesheetSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingManagerTimesheetsTimesheetIdSnapshots(props: {
  manager: ManagerPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimesheetSnapshot.IRequest;
}): Promise<IPageIHrmTimeTrackingTimesheetSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderBy =
    props.body.sort === "asc"
      ? ({
          id: "asc",
        } satisfies Prisma.hrm_time_tracking_timesheet_snapshotsOrderByWithRelationInput)
      : ({
          id: "desc",
        } satisfies Prisma.hrm_time_tracking_timesheet_snapshotsOrderByWithRelationInput);
  const where = {
    hrm_time_tracking_timesheet_id: props.timesheetId,
  } satisfies Prisma.hrm_time_tracking_timesheet_snapshotsWhereInput;
  await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const data =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...HrmTimeTrackingTimesheetSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingTimesheetSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
