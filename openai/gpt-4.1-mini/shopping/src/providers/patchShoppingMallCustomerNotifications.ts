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

export async function patchShoppingMallCustomerNotifications(props: {
  customer: CustomerPayload;
  body: IShoppingMallUserNotification.IRequest;
}): Promise<IPageIShoppingMallUserNotification.ISummary> {
  const page =
    props.body.page !== undefined && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit !== undefined
      ? Math.min(Math.max(props.body.limit, 1), 100)
      : 10;
  const skip = (page - 1) * limit;
  // Base where clause filtering by ownerType 'customer' and ownerId matching current customer
  const baseWhere = {
    owner_type: "customer",
    owner_id: props.customer.id,
    deleted_at: null,
  } as const;
  // Build filters from request body immutably
  const filters: Prisma.shopping_mall_user_notificationsWhereInput[] = [];
  if (props.body.ownerType !== undefined) {
    filters.push({ owner_type: props.body.ownerType });
  }
  if (props.body.isRead !== undefined) {
    filters.push({ is_read: props.body.isRead });
  }
  if (props.body.deliveredFrom !== undefined) {
    filters.push({ delivered_at: { gte: props.body.deliveredFrom } });
  }
  if (props.body.deliveredTo !== undefined) {
    filters.push({ delivered_at: { lte: props.body.deliveredTo } });
  }
  if (props.body.readFrom !== undefined) {
    filters.push({ read_at: { gte: props.body.readFrom } });
  }
  if (props.body.readTo !== undefined) {
    filters.push({ read_at: { lte: props.body.readTo } });
  }
  if (props.body.search !== undefined) {
    const search = props.body.search.trim();
    if (search.length > 0) {
      filters.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { body: { contains: search, mode: "insensitive" } },
        ],
      });
    }
  }
  // Combine base where and filters
  const where: Prisma.shopping_mall_user_notificationsWhereInput = {
    AND: [baseWhere, ...filters],
  };
  // Validate sort fields
  const validSortByFields = ["created_at", "delivered_at"] as const;
  let orderBy: Prisma.shopping_mall_user_notificationsOrderByWithRelationInput =
    {
      created_at: "desc",
    };
  if (
    props.body.sortBy !== undefined &&
    validSortByFields.includes(
      props.body.sortBy as (typeof validSortByFields)[number],
    )
  ) {
    orderBy = {
      [props.body.sortBy]: props.body.sortOrder === "asc" ? "asc" : "desc",
    } as Prisma.shopping_mall_user_notificationsOrderByWithRelationInput;
  }
  const records =
    await MyGlobal.prisma.shopping_mall_user_notifications.findMany({
      where,
      orderBy,
      skip,
      take: limit,
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
  const total = await MyGlobal.prisma.shopping_mall_user_notifications.count({
    where,
  });
  return {
    data: records.map((record) => ({
      id: record.id,
      ownerType: record.owner_type,
      title: record.title,
      body: record.body,
      url: record.url ?? null,
      imageUrl: record.image_url ?? null,
      isRead: record.is_read,
      deliveredAt:
        record.delivered_at === null
          ? null
          : toISOStringSafe(record.delivered_at),
      readAt: record.read_at === null ? null : toISOStringSafe(record.read_at),
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
      notificationTemplateId: record.notification_template_id,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
