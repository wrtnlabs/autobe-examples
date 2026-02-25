import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerUserNotifications(props: {
  seller: SellerPayload;
  body: IShoppingMallUserNotification.IRequest;
}): Promise<IPageIShoppingMallUserNotification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where filter
  const where: Prisma.shopping_mall_user_notificationsWhereInput = {
    owner_type: "seller",
    is_read: props.body.isRead,
    delivered_at: {
      ...(props.body.deliveredFrom && { gte: props.body.deliveredFrom }),
      ...(props.body.deliveredTo && { lte: props.body.deliveredTo }),
    },
    read_at: {
      ...(props.body.readFrom && { gte: props.body.readFrom }),
      ...(props.body.readTo && { lte: props.body.readTo }),
    },
    deleted_at: null,
  };
  // Add full-text search over title and body
  if (props.body.search) {
    where.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { body: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Resolve orderBy
  const validSortFields = new Set(["created_at", "delivered_at", "read_at"]);
  const sortBy = validSortFields.has(props.body.sortBy ?? "created_at")
    ? props.body.sortBy
    : "created_at";
  const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";
  // Find user notifications
  const notifications =
    await MyGlobal.prisma.shopping_mall_user_notifications.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy!]: sortOrder },
    });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_user_notifications.count({
    where,
  });
  // Map results to response DTO
  const data = notifications.map(
    (record): IShoppingMallUserNotification.ISummary => ({
      id: record.id,
      ownerType: record.owner_type,
      title: record.title,
      body: record.body,
      url: record.url ?? null,
      imageUrl: record.image_url ?? null,
      isRead: record.is_read,
      deliveredAt: (record.delivered_at != null
        ? toISOStringSafe(record.delivered_at)
        : null) as (string & tags.Format<"date-time">) | null,
      readAt: (record.read_at != null
        ? toISOStringSafe(record.read_at)
        : null) as (string & tags.Format<"date-time">) | null,
      createdAt: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(record.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: (record.deleted_at != null
        ? toISOStringSafe(record.deleted_at)
        : null) as (string & tags.Format<"date-time">) | null,
      notificationTemplateId: record.notification_template_id,
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
