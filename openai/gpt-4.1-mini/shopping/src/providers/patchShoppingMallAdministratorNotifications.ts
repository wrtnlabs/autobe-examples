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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorNotifications(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallUserNotification.IRequest;
}): Promise<IPageIShoppingMallUserNotification.ISummary> {
  const {
    ownerType,
    isRead,
    deliveredFrom,
    deliveredTo,
    readFrom,
    readTo,
    search,
    page = 1,
    limit = 20,
    sortBy = "created_at",
    sortOrder = "desc",
  } = props.body ?? {};
  // Validate and constrain page and limit
  const validPage = Number.isInteger(page) && page > 0 ? page : 1;
  const validLimit =
    Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 20;
  const offset = (validPage - 1) * validLimit;
  // Build Prisma where input
  const where: Prisma.shopping_mall_user_notificationsWhereInput = {
    owner_type: "administrator",
    deleted_at: null,
  };
  if (ownerType) where.owner_type = ownerType;
  if (isRead !== undefined) where.is_read = isRead;
  if (deliveredFrom || deliveredTo) {
    where.delivered_at = {} as Prisma.DateTimeFilter;
    if (deliveredFrom) where.delivered_at.gte = deliveredFrom;
    if (deliveredTo) where.delivered_at.lte = deliveredTo;
  }
  if (readFrom || readTo) {
    where.read_at = {} as Prisma.DateTimeFilter;
    if (readFrom) where.read_at.gte = readFrom;
    if (readTo) where.read_at.lte = readTo;
  }
  if (search && search.trim() !== "") {
    where.AND = [
      {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { body: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }
  // Validate sortBy
  const allowedSortBy = new Set(["created_at", "delivered_at", "read_at"]);
  const orderByField = allowedSortBy.has(sortBy) ? sortBy : "created_at";
  const orderByDirection = sortOrder === "asc" ? "asc" : "desc";
  const totalRecords =
    await MyGlobal.prisma.shopping_mall_user_notifications.count({ where });
  const data = await MyGlobal.prisma.shopping_mall_user_notifications.findMany({
    where,
    skip: offset,
    take: validLimit,
    orderBy: { [orderByField]: orderByDirection },
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
  // Helper: convert Date values to string & tags.Format<'date-time'> or null
  function toDateTimeString(value: Date | null | undefined): string | null {
    return value instanceof Date ? value.toISOString() : null;
  }
  const records = data.map((item) => ({
    id: item.id,
    ownerType: item.owner_type,
    title: item.title,
    body: item.body,
    url: item.url === null ? null : item.url,
    imageUrl: item.image_url === null ? null : item.image_url,
    isRead: item.is_read,
    deliveredAt: toDateTimeString(item.delivered_at),
    readAt: toDateTimeString(item.read_at),
    createdAt: toDateTimeString(item.created_at)!,
    updatedAt: toDateTimeString(item.updated_at)!,
    deletedAt: toDateTimeString(item.deleted_at),
    notificationTemplateId: item.notification_template_id,
  }));
  return {
    data: records,
    pagination: {
      current: validPage,
      limit: validLimit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / validLimit),
    },
  };
}
