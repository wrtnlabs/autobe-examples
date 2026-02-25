import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardMaintenanceScheduleCollector } from "../collectors/DiscussionBoardMaintenanceScheduleCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardMaintenanceScheduleTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminMaintenanceSchedules(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardMaintenanceSchedule.ICreate;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  // Validate scheduled_end_time is after scheduled_start_time using ISO string comparison
  if (props.body.scheduled_end_time <= props.body.scheduled_start_time) {
    throw new HttpException("Scheduled end time must be after start time", 400);
  }
  // Use collector with properly typed auth actor
  const created =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.create({
      data: await DiscussionBoardMaintenanceScheduleCollector.collect({
        body: props.body,
        discussionBoardAdmins: { id: props.superAdmin.id } as IEntity,
      }),
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  return await DiscussionBoardMaintenanceScheduleTransformer.transform(created);
}
