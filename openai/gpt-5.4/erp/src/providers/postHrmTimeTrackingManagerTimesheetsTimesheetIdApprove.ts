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
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingManagerTimesheetsTimesheetIdApprove(props: {
  manager: ManagerPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTimesheet> {
  const manager = await MyGlobal.prisma.hrm_time_tracking_managers.findFirst({
    where: {
      id: props.manager.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (manager === null) {
    throw new HttpException("Forbidden", 403);
  }
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (timesheet === null) {
    throw new HttpException("Not Found", 404);
  }
  if (timesheet.status !== "submitted") {
    throw new HttpException("Timesheet is not in submitted status", 409);
  }
  const now = new Date();
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const updated = await tx.hrm_time_tracking_timesheets.updateMany({
      where: {
        id: props.timesheetId,
        hrm_time_tracking_organization_id:
          timesheet.hrm_time_tracking_organization_id,
        status: "submitted",
        deleted_at: null,
      },
      data: {
        status: "approved",
        reviewed_at: now,
        updated_at: now,
      },
    });
    if (updated.count === 0) {
      throw new HttpException("Timesheet is not in submitted status", 409);
    }
    return await tx.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        hrm_time_tracking_organization_id:
          timesheet.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
  });
  return await HrmTimeTrackingTimesheetTransformer.transform(result);
}
