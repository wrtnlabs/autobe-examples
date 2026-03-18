import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimelogTransformer } from "../transformers/HrmTimeTrackingTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingEmployeeTimesheetsTimesheetIdTimelogsTimelogId(props: {
  employee: EmployeePayload;
  timesheetId: string & tags.Format<"uuid">;
  timelogId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTimelog> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        hrm_time_tracking_employee_id: true,
      },
    });
  if (timesheet.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_time_tracking_timesheet_timelogs.findFirstOrThrow({
    where: {
      hrm_time_tracking_timesheet_id: props.timesheetId,
      hrm_time_tracking_timelog_id: props.timelogId,
      deleted_at: null,
    },
    select: {
      hrm_time_tracking_timesheet_id: true,
    },
  });
  const timelog =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findFirstOrThrow({
      where: {
        id: props.timelogId,
        deleted_at: null,
        hrm_time_tracking_organization_id:
          timesheet.hrm_time_tracking_organization_id,
        hrm_time_tracking_employee_id: timesheet.hrm_time_tracking_employee_id,
      },
      ...HrmTimeTrackingTimelogTransformer.select(),
    });
  return await HrmTimeTrackingTimelogTransformer.transform(timelog);
}
