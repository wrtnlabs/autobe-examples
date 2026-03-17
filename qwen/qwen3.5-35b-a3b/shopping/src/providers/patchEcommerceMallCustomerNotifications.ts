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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerNotifications(props: {
  customer: CustomerPayload;
  body: IEcommerceMallNotification.IRequest;
}): Promise<IPageIEcommerceMallNotification.ISummary> {
  const page = props.body.page ?? 1;
  const perPage = props.body.per_page ?? props.body.limit ?? 100;
  const limit = perPage > 100 ? 100 : perPage;
  const skip = (page - 1) * limit;
  const {
    search,
    read_status,
    type,
    created_at_from,
    created_at_to,
    sort,
    order,
  } = props.body;
  const where: Prisma.ecommerce_mall_notificationsWhereInput = {
    deleted_at: null,
    recipients: {
      some: {
        deleted_at: null,
        recipient_type: "customer",
        recipient_id: props.customer.id,
        ...(read_status !== undefined && { read_status }),
        ...(created_at_from !== undefined && {
          notification: {
            created_at: {
              gte: new Date(created_at_from),
            },
          },
        }),
        ...(created_at_to !== undefined && {
          notification: {
            created_at: {
              lte: new Date(created_at_to),
            },
          },
        }),
      },
    },
    ...(search !== undefined && {
      AND: [
        {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { body: { contains: search, mode: "insensitive" } },
          ],
        },
        ...(type !== undefined ? [{ type }] : []),
      ],
    }),
    ...(type !== undefined && search === undefined ? { type } : {}),
  } satisfies Prisma.ecommerce_mall_notificationsWhereInput;
  const orderBy = (
    sort === "read_at"
      ? [
          {
            recipients: {
              _count: order === "asc" ? "asc" : "desc",
            },
          },
        ]
      : sort === "title"
        ? [{ title: order === "asc" ? "asc" : "desc" }]
        : [{ created_at: order === "asc" ? "asc" : "desc" }]
  ) satisfies Prisma.ecommerce_mall_notificationsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.ecommerce_mall_notifications.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    include: {
      recipients: {
        where: {
          recipient_id: props.customer.id,
          recipient_type: "customer",
          deleted_at: null,
        },
        select: {
          read_status: true,
          read_at: true,
        },
        take: 1,
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_notifications.count({
    where,
  });
  return {
    data: data.map((notification) => {
      const recipient = notification.recipients[0];
      return {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        status:
          recipient?.read_status === "read" ||
          recipient?.read_status === "acknowledged"
            ? "read"
            : "unread",
        created_at: toISOStringSafe(notification.created_at),
        updated_at: toISOStringSafe(notification.updated_at),
      } satisfies IEcommerceMallNotification.ISummary;
    }),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallNotification.ISummary;
}
