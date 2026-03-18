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
import { HrmTimeTrackingTimesheetSnapshotCollector } from "../collectors/HrmTimeTrackingTimesheetSnapshotCollector";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimesheetSnapshotTransformer } from "../transformers/HrmTimeTrackingTimesheetSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingEmployeeTimesheetsTimesheetIdSnapshots(props: {
  employee: EmployeePayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimesheetSnapshot.ICreate;
}): Promise<IHrmTimeTrackingTimesheetSnapshot> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
        hrm_time_tracking_employee_id: props.employee.id,
      },
      select: {
        id: true,
      },
    });
  const snapshot =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_snapshots.create({
      data: await HrmTimeTrackingTimesheetSnapshotCollector.collect({
        body: props.body,
        timesheet: {
          id: timesheet.id,
        },
      }),
      select: {
        id: true,
      },
    });
  const found =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_snapshots.findUniqueOrThrow(
      {
        where: {
          id: snapshot.id,
        },
        ...HrmTimeTrackingTimesheetSnapshotTransformer.select(),
      },
    );
  return await HrmTimeTrackingTimesheetSnapshotTransformer.transform(found);
}
