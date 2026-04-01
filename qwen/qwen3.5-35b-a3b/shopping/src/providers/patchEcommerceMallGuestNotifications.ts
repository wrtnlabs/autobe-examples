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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { EcommerceMallNotificationAtSummaryTransformer } from "../transformers/EcommerceMallNotificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallGuestNotifications(props: {
  guest: GuestPayload;
  body: IEcommerceMallNotification.IRequest;
}): Promise<IPageIEcommerceMallNotification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.per_page ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause for guest notifications with session scoping
  const whereInput: Prisma.ecommerce_mall_notificationsWhereInput = {
    deleted_at: null,
    guestReference: {
      is: {
        guest_id: props.guest.id,
        guest_session_id: props.guest.session_id,
      },
    },
    recipients: {
      some: {
        recipient_type: "guest",
        recipient_id: props.guest.id,
        deleted_at: null,
      },
    },
    ...(props.body.type !== undefined && {
      type: props.body.type,
    }),
    ...(props.body.read_status !== undefined && {
      recipients: {
        some: {
          recipient_type: "guest",
          recipient_id: props.guest.id,
          read_status: props.body.read_status,
          deleted_at: null,
        },
      },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          body: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_notificationsWhereInput;
  // Build order by clause based on sort and order parameters
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  let orderByInput: Prisma.ecommerce_mall_notificationsOrderByWithRelationInput[] =
    [];
  if (sortField === "created_at") {
    orderByInput = [{ created_at: sortOrder as "asc" | "desc" }];
  } else if (sortField === "title") {
    orderByInput = [{ title: sortOrder as "asc" | "desc" }];
  }
  // Query notifications
  const data = await MyGlobal.prisma.ecommerce_mall_notifications.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit > 0 ? limit : 100,
    ...EcommerceMallNotificationAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.ecommerce_mall_notifications.count({
    where: whereInput,
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallNotificationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
