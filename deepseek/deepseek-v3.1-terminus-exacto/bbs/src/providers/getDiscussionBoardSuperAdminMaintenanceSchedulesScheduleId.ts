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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardMaintenanceScheduleTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminMaintenanceSchedulesScheduleId(props: {
  superAdmin: SuperadminPayload;
  scheduleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  const schedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUnique({
      where: {
        id: props.scheduleId,
        deleted_at: null,
      },
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  if (!schedule) {
    throw new HttpException("Maintenance schedule not found", 404);
  }
  return await DiscussionBoardMaintenanceScheduleTransformer.transform(
    schedule,
  );
}
