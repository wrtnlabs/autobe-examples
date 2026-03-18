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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingTimesheetSnapshotAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimesheetSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingOwnerTimesheetsTimesheetIdSnapshots(props: {
  owner: OwnerPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimesheetSnapshot.IRequest;
}): Promise<IPageIHrmTimeTrackingTimesheetSnapshot.ISummary> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findUniqueOrThrow({
      where: { id: props.owner.session_id },
      select: {
        hrm_time_tracking_owner_id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (session.hrm_time_tracking_owner_id !== props.owner.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_time_tracking_timesheets
    .findFirstOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    })
    .then((timesheet) => {
      if (
        timesheet.hrm_time_tracking_organization_id !==
        session.hrm_time_tracking_organization_id
      ) {
        throw new HttpException("Forbidden", 403);
      }
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderBy =
    props.body.sort === undefined || props.body.sort === "id_desc"
      ? ({
          id: "desc",
        } satisfies Prisma.hrm_time_tracking_timesheet_snapshotsOrderByWithRelationInput)
      : props.body.sort === "id_asc"
        ? ({
            id: "asc",
          } satisfies Prisma.hrm_time_tracking_timesheet_snapshotsOrderByWithRelationInput)
        : null;
  if (orderBy === null) {
    throw new HttpException("Invalid sort", 400);
  }
  const where = {
    hrm_time_tracking_timesheet_id: props.timesheetId,
  } satisfies Prisma.hrm_time_tracking_timesheet_snapshotsWhereInput;
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
