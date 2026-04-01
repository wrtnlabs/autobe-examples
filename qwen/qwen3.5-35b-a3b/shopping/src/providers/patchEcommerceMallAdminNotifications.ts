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
  const limit = props.body.limit ?? props.body.per_page ?? 100;
  const skip = (page - 1) * limit;
  // Verify admin exists and is active
  const adminRecord = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
  });
  if (adminRecord === null) {
    throw new HttpException("Unauthorized", 401);
  }
  // Build WHERE clause with all filters
  const whereInput: Prisma.ecommerce_mall_notificationsWhereInput = {
    deleted_at: null,
    ...(props.body.read_status !== undefined &&
      props.body.read_status !== "" && {
        status: props.body.read_status,
      }),
    ...(props.body.type !== undefined &&
      props.body.type !== "" && {
        type: props.body.type,
      }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null && {
        created_at: {
          gte: new Date(props.body.created_at_from),
        },
      }),
    ...(props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null && {
        created_at: {
          lte: new Date(props.body.created_at_to),
        },
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null &&
      props.body.search.length > 0 && {
        OR: [
          { title: { contains: props.body.search, mode: "insensitive" } },
          { body: { contains: props.body.search, mode: "insensitive" } },
        ],
      }),
    // Polymorphic recipient filtering - admins can filter by any actor type
    ...(props.body.actor_type !== undefined &&
      props.body.actor_type !== null &&
      props.body.actor_id !== undefined &&
      props.body.actor_id !== null &&
      props.body.actor_type.length > 0 && {
        recipients: {
          some: {
            recipient_type: props.body.actor_type,
            recipient_id: props.body.actor_id,
          },
        },
      }),
  } satisfies Prisma.ecommerce_mall_notificationsWhereInput;
  // Build ORDER BY clause
  const orderByInput: Prisma.ecommerce_mall_notificationsOrderByWithRelationInput[] =
    (() => {
      const sortField = props.body.sort ?? "created_at";
      const sortOrder = (props.body.order ?? "desc") === "asc" ? "asc" : "desc";
      switch (sortField) {
        case "created_at":
          return [
            { created_at: sortOrder },
            { id: sortOrder },
          ] satisfies Prisma.ecommerce_mall_notificationsOrderByWithRelationInput[];
        case "title":
          return [
            { title: sortOrder },
            { id: sortOrder },
          ] satisfies Prisma.ecommerce_mall_notificationsOrderByWithRelationInput[];
        default:
          return [
            { created_at: sortOrder },
            { id: sortOrder },
          ] satisfies Prisma.ecommerce_mall_notificationsOrderByWithRelationInput[];
      }
    })();
  // Query notifications with select for list display
  const data = await MyGlobal.prisma.ecommerce_mall_notifications.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_notifications.count({
    where: whereInput,
  });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(data, async (record) => {
      const transformed: IEcommerceMallNotification.ISummary = {
        id: record.id,
        title: record.title,
        body: record.body,
        type: record.type,
        status: record.status,
        created_at: toISOStringSafe(record.created_at),
        updated_at: toISOStringSafe(record.updated_at),
      };
      return transformed;
    }),
  };
}
