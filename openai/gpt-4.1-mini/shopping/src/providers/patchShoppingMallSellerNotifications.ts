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

export async function patchShoppingMallSellerNotifications(props: {
  seller: SellerPayload;
  body: IShoppingMallUserNotification.IRequest;
}): Promise<IPageIShoppingMallUserNotification.ISummary> {
  const { seller, body } = props;
  // Default pagination values with validation
  const page = body.page !== undefined && body.page >= 1 ? body.page : 1;
  const limit =
    body.limit !== undefined && body.limit >= 1 && body.limit <= 100
      ? body.limit
      : 10;
  const skip = (page - 1) * limit;
  // Build where filter
  const where: Prisma.shopping_mall_user_notificationsWhereInput = {
    owner_id: seller.id,
    owner_type: "seller",
    deleted_at: null,
  };
  if (body.isRead !== undefined) {
    where.is_read = body.isRead;
  }
  // delivered_at filter build
  if (body.deliveredFrom !== undefined || body.deliveredTo !== undefined) {
    where.delivered_at = {};
    if (body.deliveredFrom !== undefined) {
      where.delivered_at.gte = body.deliveredFrom;
    }
    if (body.deliveredTo !== undefined) {
      where.delivered_at.lte = body.deliveredTo;
    }
  }
  // read_at filter build
  if (body.readFrom !== undefined || body.readTo !== undefined) {
    where.read_at = {};
    if (body.readFrom !== undefined) {
      where.read_at.gte = body.readFrom;
    }
    if (body.readTo !== undefined) {
      where.read_at.lte = body.readTo;
    }
  }
  if (body.search !== undefined && body.search.trim() !== "") {
    where.OR = [
      { title: { contains: body.search, mode: "insensitive" } },
      { body: { contains: body.search, mode: "insensitive" } },
    ];
  }
  // Validate sort fields
  const validSortFields = new Set([
    "created_at",
    "delivered_at",
    "read_at",
    "title",
  ]);
  const sortBy = validSortFields.has(body.sortBy ?? "")
    ? (body.sortBy as keyof Prisma.shopping_mall_user_notificationsOrderByWithRelationInput)
    : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";
  // Query total records count
  const total = await MyGlobal.prisma.shopping_mall_user_notifications.count({
    where,
  });
  // Query notifications
  const records =
    await MyGlobal.prisma.shopping_mall_user_notifications.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy as string]: sortOrder },
      select: {
        id: true,
        owner_type: true,
        title: true,
        body: true,
        url: true,
        image_url: true,
        is_read: true,
        delivered_at: true,
        read_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        notification_template_id: true,
      },
    });
  // Map database records to API response
  const data = records.map((record) => ({
    id: record.id,
    ownerType: record.owner_type,
    title: record.title,
    body: record.body,
    url: record.url ?? null,
    imageUrl: record.image_url ?? null,
    isRead: record.is_read,
    deliveredAt: record.delivered_at
      ? toISOStringSafe(record.delivered_at)
      : null,
    readAt: record.read_at ? toISOStringSafe(record.read_at) : null,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    notificationTemplateId: record.notification_template_id,
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  } satisfies IPageIShoppingMallUserNotification.ISummary;
}
