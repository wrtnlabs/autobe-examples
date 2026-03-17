import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminNotifications(props: {
  admin: AdminPayload;
  body: IEcommerceMallNotification.IRequest;
}): Promise<IPageIEcommerceMallNotification.ISummary> {
  const page = props.body.page ?? 1;
  const per_page = props.body.per_page ?? 100;
  const limit = props.body.limit ?? per_page;
  const safe_limit = Math.min(Math.max(limit, 0), 100);
  const safe_page = Math.max(page, 1);
  const skip = (safe_page - 1) * safe_limit;
  const recipientsWhereClause: Prisma.ecommerce_mall_notification_recipientsWhereInput =
    {
      deleted_at: null,
    };
  if (props.body.actor_type) {
    recipientsWhereClause.recipient_type = props.body.actor_type;
  }
  if (props.body.actor_id) {
    recipientsWhereClause.recipient_id = props.body.actor_id;
  }
  if (props.body.read_status) {
    recipientsWhereClause.read_status = props.body.read_status;
  }
  const whereClause: Prisma.ecommerce_mall_notificationsWhereInput = {
    deleted_at: null,
  };
  if (props.body.actor_type || props.body.actor_id || props.body.read_status) {
    whereClause.recipients = {
      some: recipientsWhereClause,
    };
  }
  if (props.body.type) {
    whereClause.type = props.body.type;
  }
  if (props.body.created_at_from) {
    whereClause.created_at = {
      gte: new Date(props.body.created_at_from),
    };
  }
  if (props.body.created_at_to) {
    if (
      whereClause.created_at &&
      typeof whereClause.created_at === "object" &&
      "gte" in whereClause.created_at
    ) {
      whereClause.created_at = {
        gte: whereClause.created_at.gte,
        lte: new Date(props.body.created_at_to),
      };
    } else {
      whereClause.created_at = {
        lte: new Date(props.body.created_at_to),
      };
    }
  }
  if (props.body.search) {
    whereClause.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { body: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  const orderByInput = (() => {
    const sortField = props.body.sort ?? "created_at";
    const order = (props.body.order as "asc" | "desc") ?? "desc";
    if (sortField === "created_at") {
      return {
        created_at: order,
      } satisfies Prisma.ecommerce_mall_notificationsOrderByWithRelationInput;
    }
    if (sortField === "title") {
      return {
        title: order,
      } satisfies Prisma.ecommerce_mall_notificationsOrderByWithRelationInput;
    }
    return {
      created_at: order,
    } satisfies Prisma.ecommerce_mall_notificationsOrderByWithRelationInput;
  })();
  const data = await MyGlobal.prisma.ecommerce_mall_notifications.findMany({
    where: whereClause,
    take: safe_limit,
    skip,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      body: true,
      type: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_notifications.count({
    where: whereClause,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      type: item.type,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
    pagination: {
      current: safe_page,
      limit: safe_limit,
      records: total,
      pages: Math.ceil(total / safe_limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallNotification.ISummary;
}
