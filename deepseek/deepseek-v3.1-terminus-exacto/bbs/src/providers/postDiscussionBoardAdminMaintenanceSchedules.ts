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
  const created =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.create({
      data: await DiscussionBoardMaintenanceScheduleCollector.collect({
        body: props.body,
        discussionBoardAdmins: { id: props.admin.id },
      }),
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  return await DiscussionBoardMaintenanceScheduleTransformer.transform(created);
}
