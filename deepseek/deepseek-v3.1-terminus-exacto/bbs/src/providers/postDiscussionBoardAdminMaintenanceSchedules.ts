import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardMaintenanceScheduleCollector } from "../collectors/DiscussionBoardMaintenanceScheduleCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardMaintenanceScheduleTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminMaintenanceSchedules(props: {
  admin: AdminPayload;
  body: IDiscussionBoardMaintenanceSchedule.ICreate;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  // Validate planned_end_at is after planned_start_at
  if (props.body.planned_end_at <= props.body.planned_start_at) {
    throw new HttpException(
      "Planned end time must be after planned start time",
      400,
    );
  }
  // Find appropriate pending status type
  const statusType =
    await MyGlobal.prisma.discussion_board_status_types.findFirst({
      where: {
        category: "maintenance_schedule",
        code: "pending",
        is_active: true,
      },
    });
  if (!statusType) {
    throw new HttpException("No valid pending status type found", 500);
  }
  // Create maintenance schedule using collector
  const created =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.create({
      data: await DiscussionBoardMaintenanceScheduleCollector.collect({
        body: props.body,
        statusType: statusType,
      }),
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  return await DiscussionBoardMaintenanceScheduleTransformer.transform(created);
}
