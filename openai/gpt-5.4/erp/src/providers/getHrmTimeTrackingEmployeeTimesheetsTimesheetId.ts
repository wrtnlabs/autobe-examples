import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingEmployeeTimesheetsTimesheetId(props: {
  employee: EmployeePayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTimesheet> {
  await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
    where: {
      id: props.timesheetId,
      hrm_time_tracking_employee_id: props.employee.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        hrm_time_tracking_employee_id: props.employee.id,
        deleted_at: null,
      },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
  return await HrmTimeTrackingTimesheetTransformer.transform(timesheet);
}
