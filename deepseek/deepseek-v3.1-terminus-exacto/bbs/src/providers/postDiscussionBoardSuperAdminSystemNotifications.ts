import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSystemNotificationCollector } from "../collectors/DiscussionBoardSystemNotificationCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemNotificationTransformer } from "../transformers/DiscussionBoardSystemNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSystemNotifications(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemNotification.ICreate;
}): Promise<IDiscussionBoardSystemNotification> {
  // Use collector to transform request body - framework handles validation
  const createData = await DiscussionBoardSystemNotificationCollector.collect({
    body: props.body,
  });
  // Adjust delivery timestamps based on status using ISO strings
  const now = new Date().toISOString();
  const adjustedData = {
    ...createData,
    delivered_at: ["sent", "read"].includes(props.body.status)
      ? new Date(now)
      : null,
    read_at: props.body.status === "read" ? new Date(now) : null,
  };
  // Create the notification
  const notification =
    await MyGlobal.prisma.discussion_board_system_notifications.create({
      data: adjustedData,
      ...DiscussionBoardSystemNotificationTransformer.select(),
    });
  // Transform to response DTO
  return await DiscussionBoardSystemNotificationTransformer.transform(
    notification,
  );
}
