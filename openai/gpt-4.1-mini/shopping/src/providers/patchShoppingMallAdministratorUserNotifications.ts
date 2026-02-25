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

function toISODateTimeString(
  date: Date | null | undefined,
): (string & tags.Format<"date-time">) | null {
  if (!date) return null;
  if (typeof date === "string")
    return date as string & tags.Format<"date-time">;
  return date.toISOString() as unknown as string & tags.Format<"date-time">;
}
export async function patchShoppingMallAdministratorUserNotifications(props: {
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
    limit = 30,
    sortBy,
    sortOrder,
  } = props.body;
  const where: Prisma.shopping_mall_user_notificationsWhereInput = {
    deleted_at: null,
    ...(ownerType !== undefined && { owner_type: ownerType }),
    ...(isRead !== undefined && { is_read: isRead }),
    ...(deliveredFrom !== undefined && {
      delivered_at: { gte: deliveredFrom },
    }),
    ...(deliveredTo !== undefined && { delivered_at: { lte: deliveredTo } }),
    ...(readFrom !== undefined && { read_at: { gte: readFrom } }),
    ...(readTo !== undefined && { read_at: { lte: readTo } }),
    ...(search !== undefined && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { body: { contains: search, mode: "insensitive" } },
      ],
    }),
  };
  const sanitizedPage = page < 1 ? 1 : page;
  const sanitizedLimit = limit < 1 ? 30 : limit > 100 ? 100 : limit;
  const skip = (sanitizedPage - 1) * sanitizedLimit;
  const orderBy: Prisma.shopping_mall_user_notificationsOrderByWithRelationInput =
    sortBy !== undefined && (sortOrder === "asc" || sortOrder === "desc")
      ? { [sortBy]: sortOrder }
      : { created_at: "desc" };
  const total = await MyGlobal.prisma.shopping_mall_user_notifications.count({
    where,
  });
  const records =
    await MyGlobal.prisma.shopping_mall_user_notifications.findMany({
      where,
      skip,
      take: sanitizedLimit,
      orderBy,
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
  return {
    data: records.map((r) => ({
      id: r.id,
      ownerType: r.owner_type,
      title: r.title,
      body: r.body,
      url: r.url ?? null,
      imageUrl: r.image_url ?? null,
      isRead: r.is_read,
      deliveredAt: toISODateTimeString(r.delivered_at),
      readAt: toISODateTimeString(r.read_at),
      createdAt: toISODateTimeString(r.created_at)!,
      updatedAt: toISODateTimeString(r.updated_at)!,
      deletedAt: toISODateTimeString(r.deleted_at),
      notificationTemplateId: r.notification_template_id,
    })),
    pagination: {
      current: sanitizedPage,
      limit: sanitizedLimit,
      records: total,
      pages: Math.ceil(total / sanitizedLimit),
    },
  };
}
