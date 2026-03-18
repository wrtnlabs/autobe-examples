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
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimesheetSnapshotAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimesheetSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingEmployeeTimesheetsTimesheetIdSnapshots(props: {
  employee: EmployeePayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimesheetSnapshot.IRequest;
}): Promise<IPageIHrmTimeTrackingTimesheetSnapshot.ISummary> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
      },
    });
  if (timesheet.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderByInput =
    props.body.sort === "id_asc"
      ? ({
          id: "asc",
        } satisfies Prisma.hrm_time_tracking_timesheet_snapshotsOrderByWithRelationInput)
      : props.body.sort === "id_desc"
        ? ({
            id: "desc",
          } satisfies Prisma.hrm_time_tracking_timesheet_snapshotsOrderByWithRelationInput)
        : ({
            id: "desc",
          } satisfies Prisma.hrm_time_tracking_timesheet_snapshotsOrderByWithRelationInput);
  const data =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_snapshots.findMany({
      where: {
        hrm_time_tracking_timesheet_id: props.timesheetId,
      },
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmTimeTrackingTimesheetSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_snapshots.count({
      where: {
        hrm_time_tracking_timesheet_id: props.timesheetId,
      },
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
