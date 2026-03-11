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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemNotificationAtSummaryTransformer } from "../transformers/DiscussionBoardSystemNotificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminSystemNotifications(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemNotification.IRequest;
}): Promise<IPageIDiscussionBoardSystemNotification.ISummary> {
  // Setup pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate target_entity_id requires target_entity_type
  if (props.body.target_entity_id && !props.body.target_entity_type) {
    throw new HttpException(
      "target_entity_type is required when target_entity_id is specified",
      400,
    );
  }
  // Build WHERE conditions
  const whereInput: Prisma.discussion_board_system_notificationsWhereInput = {
    // Text search using case-insensitive contains on title and content
    // (Alternative to trigram similarity since raw SQL queries are forbidden)
    ...(props.body.search && {
      OR: [
        {
          title: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          content: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ],
    }),
    // Filter by notification_type
    ...(props.body.notification_type && {
      notification_type: props.body.notification_type,
    }),
    // Filter by status
    ...(props.body.status && {
      status: props.body.status,
    }),
    // Filter by priority
    ...(props.body.priority && {
      priority: props.body.priority,
    }),
    // Filter by target_entity_type
    ...(props.body.target_entity_type && {
      target_entity_type: props.body.target_entity_type,
    }),
    // Filter by target_entity_id
    ...(props.body.target_entity_id && {
      target_entity_id: props.body.target_entity_id,
    }),
  };
  // Execute queries
  const [notifications, total] = await Promise.all([
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
  const data = await ArrayUtil.asyncMap(
    notifications,
    DiscussionBoardSystemNotificationAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIDiscussionBoardSystemNotification.ISummary;
}
