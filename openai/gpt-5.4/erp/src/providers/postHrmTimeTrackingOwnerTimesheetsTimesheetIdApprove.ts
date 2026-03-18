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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingOwnerTimesheetsTimesheetIdApprove(props: {
  owner: OwnerPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
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
  if (timesheet.status !== "submitted") {
    throw new HttpException("Timesheet is not in submitted status", 409);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const updated = await tx.hrm_time_tracking_timesheets.updateMany({
      where: {
        id: props.timesheetId,
        status: "submitted",
        deleted_at: null,
        hrm_time_tracking_organization_id:
          timesheet.hrm_time_tracking_organization_id,
      },
      data: {
        status: "approved",
        reviewed_at: new Date(),
        updated_at: new Date(),
      },
    });
    if (updated.count === 0) {
      throw new HttpException(
        "Timesheet is no longer in submitted status",
        409,
      );
    }
    const approved = await tx.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
    return await HrmTimeTrackingTimesheetTransformer.transform(approved);
  });
}
