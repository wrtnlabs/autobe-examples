import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheetSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimesheetSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimesheetSnapshotAtSummaryTransformer } from "../transformers/HrmTimeTrackTimesheetSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberTimesheetsTimesheetIdSnapshots(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackTimesheetSnapshot.IRequest;
}): Promise<IPageIHrmTimeTrackTimesheetSnapshot.ISummary> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_track_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        employee: {
          select: {
            hrm_time_track_organization_id: true,
          },
        },
      },
    });
  const targetOrgId = timesheet.employee.hrm_time_track_organization_id;
  const memberEmployee =
    await MyGlobal.prisma.hrm_time_track_employees.findFirst({
      where: {
        hrm_time_track_member_id: props.member.id,
        hrm_time_track_organization_id: targetOrgId,
        deleted_at: null,
      },
    });
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_time_track_timesheet_snapshotsWhereInput = {
    hrm_time_track_timesheet_id: props.timesheetId,
    ...(props.body.status !== undefined && { status: props.body.status }),
  };
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = (props.body.sortOrder ?? "desc") as "asc" | "desc";
  const orderByInput: Prisma.hrm_time_track_timesheet_snapshotsOrderByWithRelationInput =
    {
      [sortBy]: sortOrder,
    };
  const records =
    await MyGlobal.prisma.hrm_time_track_timesheet_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmTimeTrackTimesheetSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.hrm_time_track_timesheet_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackTimesheetSnapshotAtSummaryTransformer.transform,
    ),
  };
}
