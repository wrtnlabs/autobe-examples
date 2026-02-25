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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardMaintenanceScheduleTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminMaintenanceSchedules(props: {
  admin: AdminPayload;
  body: IDiscussionBoardMaintenanceSchedule.ICreate;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  // Validate time sequence without Date instantiation
  if (props.body.scheduled_end_time <= props.body.scheduled_start_time) {
    throw new HttpException(
      "Scheduled end time must be after scheduled start time",
      400,
    );
  }
  // Verify the admin exists and is active
  const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Admin not found or inactive", 404);
  }
  // Use collector to transform input data with proper entity parameter
  const createData = await DiscussionBoardMaintenanceScheduleCollector.collect({
    body: props.body,
    discussionBoardAdmins: { id: props.admin.id } as IEntity,
  });
  // Create the maintenance schedule record
  const created =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.create({
      data: createData,
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  // Transform timestamp strings appropriately
  const result =
    await DiscussionBoardMaintenanceScheduleTransformer.transform(created);
  return result;
}
