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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemNotificationTransformer } from "../transformers/DiscussionBoardSystemNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardAdminSystemNotifications(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemNotification.ICreate;
}): Promise<IDiscussionBoardSystemNotification> {
  // Validate target entity existence if provided
  if (props.body.target_entity_type && props.body.target_entity_id) {
    try {
      const entityExists = await validateTargetEntity(
        props.body.target_entity_type,
        props.body.target_entity_id,
      );
      if (!entityExists) {
        throw new HttpException(
          `Target entity not found: ${props.body.target_entity_type} with id ${props.body.target_entity_id}`,
          400,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException("Failed to validate target entity", 400);
    }
  }
  try {
    // Use collector to transform request body to database input
    const collectorData =
      await DiscussionBoardSystemNotificationCollector.collect({
        body: props.body,
      });
    // Create a new data object with proper delivery timestamps
    const now = new Date();
    const data: Prisma.discussion_board_system_notificationsCreateInput = {
      ...collectorData,
      // Override delivery timestamps based on status
      delivered_at:
        props.body.status === "sent" || props.body.status === "read"
          ? now
          : null,
      read_at: props.body.status === "read" ? now : null,
    };
    // Create the notification
    const notification =
      await MyGlobal.prisma.discussion_board_system_notifications.create({
        data,
        ...DiscussionBoardSystemNotificationTransformer.select(),
      });
    // Transform to response DTO
    return await DiscussionBoardSystemNotificationTransformer.transform(
      notification,
    );
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException("Failed to create system notification", 500);
  }
}
async function validateTargetEntity(
  entityType: string,
  entityId: string,
): Promise<boolean> {
  const entityMappings: Record<string, string> = {
    article: "discussion_board_articles",
    comment: "discussion_board_comments",
    section: "discussion_board_sections",
    admin_request: "discussion_board_admin_requests",
    user: "discussion_board_members",
  };
  const tableName = entityMappings[entityType];
  if (!tableName) {
    return false;
  }
  try {
    // Use Prisma client API instead of raw SQL
    const modelMethod =
      MyGlobal.prisma[tableName as keyof typeof MyGlobal.prisma];
    if (modelMethod && typeof (modelMethod as any).findFirst === "function") {
      const entity = await (modelMethod as any).findFirst({
        where: {
          id: entityId,
          deleted_at: null,
        },
        select: { id: true },
      });
      return entity !== null;
    }
    return false;
  } catch {
    return false;
  }
}
