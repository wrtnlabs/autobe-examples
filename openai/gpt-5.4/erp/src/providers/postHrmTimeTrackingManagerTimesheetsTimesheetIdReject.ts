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

export async function postHrmTimeTrackingManagerTimesheetsTimesheetIdReject(props: {
  manager: ManagerPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimesheet.IReject;
}): Promise<IHrmTimeTrackingTimesheet> {
  const trimmedRejectionReason = (props.body.rejection_reason ?? "").trim();
  if (trimmedRejectionReason.length === 0) {
    throw new HttpException("Rejection reason is required", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const timesheet = await tx.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (timesheet.status !== "submitted") {
      throw new HttpException("Only submitted timesheets can be rejected", 400);
    }
    await tx.hrm_time_tracking_timesheets.update({
      where: {
        id: props.timesheetId,
      },
      data: {
        status: "draft",
        rejection_reason: trimmedRejectionReason,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
  return await HrmTimeTrackingTimesheetTransformer.transform(updated);
}
