import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemNotificationAtSummaryTransformer } from "../transformers/DiscussionBoardSystemNotificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSystemNotifications(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemNotification.IRequest;
}): Promise<IPageIDiscussionBoardSystemNotification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions based on request filters
  const whereInput: Prisma.discussion_board_system_notificationsWhereInput = {
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { content: { contains: props.body.search } },
      ],
    }),
    ...(props.body.notification_type && {
      notification_type: props.body.notification_type,
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.priority && { priority: props.body.priority }),
    ...(props.body.target_entity_type && {
      target_entity_type: props.body.target_entity_type,
    }),
    ...(props.body.target_entity_id && {
      target_entity_id: props.body.target_entity_id,
    }),
  };
  try {
    // Execute paginated query
    const [data, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_system_notifications.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...DiscussionBoardSystemNotificationAtSummaryTransformer.select(),
      }),
      MyGlobal.prisma.discussion_board_system_notifications.count({
        where: whereInput,
      }),
    ]);
    // Transform results
    const transformedData = await ArrayUtil.asyncMap(
      data,
      DiscussionBoardSystemNotificationAtSummaryTransformer.transform,
    );
    return {
      data: transformedData,
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve system notifications", 500);
  }
}
