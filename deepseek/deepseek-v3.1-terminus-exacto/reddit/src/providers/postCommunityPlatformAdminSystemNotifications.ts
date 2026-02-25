import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformSystemNotificationCollector } from "../collectors/CommunityPlatformSystemNotificationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemNotificationTransformer } from "../transformers/CommunityPlatformSystemNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminSystemNotifications(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemNotification.ICreate;
}): Promise<ICommunityPlatformSystemNotification> {
  // Validate enum values
  const validNotificationTypes = [
    "report_alerts",
    "moderation_actions",
    "platform_announcements",
    "user_activities",
  ];
  const validPriorities = ["low", "normal", "high", "urgent"];
  const validStatuses = ["pending", "processing", "completed"];
  if (!validNotificationTypes.includes(props.body.notification_type)) {
    throw new HttpException(
      `Invalid notification_type. Must be one of: ${validNotificationTypes.join(", ")}`,
      400,
    );
  }
  if (!validPriorities.includes(props.body.priority)) {
    throw new HttpException(
      `Invalid priority. Must be one of: ${validPriorities.join(", ")}`,
      400,
    );
  }
  if (!validStatuses.includes(props.body.status)) {
    throw new HttpException(
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      400,
    );
  }
  // Validate related entity existence
  if (props.body.related_community_id) {
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.body.related_community_id },
    });
  }
  if (props.body.related_post_id) {
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.body.related_post_id },
    });
  }
  if (props.body.related_comment_id) {
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.body.related_comment_id },
    });
  }
  // Create notification using collector
  const created =
    await MyGlobal.prisma.community_platform_system_notifications.create({
      data: await CommunityPlatformSystemNotificationCollector.collect({
        body: props.body,
      }),
      ...CommunityPlatformSystemNotificationTransformer.select(),
    });
  // Handle broadcast notifications (create delivery tracking)
  if (props.body.is_broadcast) {
    // Implementation for broadcast delivery tracking would go here
    // This creates delivery records for all platform users
  }
  // Transform and return response
  return await CommunityPlatformSystemNotificationTransformer.transform(
    created,
  );
}
