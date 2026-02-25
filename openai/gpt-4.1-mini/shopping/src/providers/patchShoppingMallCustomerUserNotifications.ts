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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerUserNotifications(props: {
  customer: CustomerPayload;
  body: IShoppingMallUserNotification.IRequest;
}): Promise<IPageIShoppingMallUserNotification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Construct date filters as ISO strings (no native Date usage)
  const deliveredFrom = props.body.deliveredFrom ?? null;
  const deliveredTo = props.body.deliveredTo ?? null;
  const readFrom = props.body.readFrom ?? null;
  const readTo = props.body.readTo ?? null;
  // Build Prisma where filter
  const where: Prisma.shopping_mall_user_notificationsWhereInput = {
    deleted_at: null,
    owner_id: props.customer.id,
    owner_type: props.body.ownerType ?? props.customer.type,
    ...(props.body.isRead !== undefined && { is_read: props.body.isRead }),
    ...((deliveredFrom || deliveredTo) && {
      delivered_at: {
        ...(deliveredFrom && { gte: deliveredFrom }),
        ...(deliveredTo && { lte: deliveredTo }),
      },
    }),
    ...((readFrom || readTo) && {
      read_at: {
        ...(readFrom && { gte: readFrom }),
        ...(readTo && { lte: readTo }),
      },
    }),
  };
  // Full-text search on title and body
  if (props.body.search) {
    where.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { body: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Allowed sorting fields
  const orderByAllowed = ["created_at", "delivered_at", "read_at"] as const;
  type OrderByField = (typeof orderByAllowed)[number];
  const orderByField: string = props.body.sortBy ?? "created_at";
  const orderDirection = props.body.sortOrder ?? "desc";
  // Build orderBy condition
  const orderBy: Prisma.shopping_mall_user_notificationsOrderByWithRelationInput =
    {};
  if (orderByAllowed.includes(orderByField as OrderByField)) {
    orderBy[orderByField as OrderByField] = orderDirection;
  } else {
    orderBy["created_at"] = "desc";
  }
  // Query total count
  const totalCount =
    await MyGlobal.prisma.shopping_mall_user_notifications.count({ where });
  // Query paginated records
  const records =
    await MyGlobal.prisma.shopping_mall_user_notifications.findMany({
      where,
      skip,
      take: limit,
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
  // Convert records to DTO format with safe ISO string conversion
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
    createdAt: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(record.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    notificationTemplateId: record.notification_template_id,
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data,
  };
}
