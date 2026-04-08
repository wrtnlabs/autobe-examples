import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimerSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackTimerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimerSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimerSnapshotAtSummaryTransformer } from "../transformers/HrmTimeTrackTimerSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberTimersTimerIdSnapshots(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackTimerSnapshot.IRequest;
}): Promise<IPageIHrmTimeTrackTimerSnapshot.ISummary> {
  // Validate timer exists and get employee organization context
  const timer = await MyGlobal.prisma.hrm_time_track_timers.findUniqueOrThrow({
    where: {
      id: props.timerId,
    },
    select: {
      hrm_time_track_employee_id: true,
    },
  });
  // Get the employee record to verify organization membership
  const employee =
    await MyGlobal.prisma.hrm_time_track_employees.findUniqueOrThrow({
      where: {
        id: timer.hrm_time_track_employee_id,
      },
      select: {
        hrm_time_track_member_id: true,
        hrm_time_track_organization_id: true,
      },
    });
  // Verify the requesting member has access to this timer's organization
  const memberOrganization =
    await MyGlobal.prisma.hrm_time_track_employees.findFirst({
      where: {
        hrm_time_track_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_time_track_organization_id: true,
      },
    });
  if (
    memberOrganization === null ||
    memberOrganization.hrm_time_track_organization_id !==
      employee.hrm_time_track_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Build WHERE clause with filters
  const whereInput = {
    hrm_time_track_timer_id: props.timerId,
    ...(props.body.event_type !== undefined && {
      event_type: props.body.event_type,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.hrm_time_track_timer_snapshotsWhereInput;
  // Build ORDER BY clause
  const orderByInput =
    props.body.sortBy && props.body.sortOrder
      ? ({
          [props.body.sortBy]: props.body.sortOrder,
        } satisfies Prisma.hrm_time_track_timer_snapshotsOrderByWithRelationInput)
      : ({
          created_at: "desc" as const,
        } satisfies Prisma.hrm_time_track_timer_snapshotsOrderByWithRelationInput);
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Execute queries sequentially
  const records = await MyGlobal.prisma.hrm_time_track_timer_snapshots.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmTimeTrackTimerSnapshotAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.hrm_time_track_timer_snapshots.count({
    where: whereInput,
  });
  // Transform records
  const transformedData = await ArrayUtil.asyncMap(
    records,
    HrmTimeTrackTimerSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIHrmTimeTrackTimerSnapshot.ISummary;
}
