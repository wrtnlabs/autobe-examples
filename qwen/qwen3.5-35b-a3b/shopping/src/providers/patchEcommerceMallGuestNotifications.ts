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
  const per_page = props.body.per_page ?? 100;
  const limit = props.body.limit ?? 100;
  const effectiveLimit = per_page < limit ? per_page : limit;
  const skip = (page - 1) * effectiveLimit;
  const whereInput: Prisma.ecommerce_mall_notificationsWhereInput = {
    deleted_at: null,
    status: props.body.read_status ?? undefined,
    type: props.body.type ?? undefined,
    ...(props.body.actor_type === "guest"
      ? {
          guestNotifications: {
            some: {
              guest_id: props.guest.id,
            },
          },
        }
      : {}),
    ...(props.body.search
      ? {
          OR: [
            { title: { contains: props.body.search } },
            { body: { contains: props.body.search } },
          ],
        }
      : {}),
  };
  const orderByInput = (
    props.body.sort === "title"
      ? { title: props.body.order === "asc" ? "asc" : "desc" }
      : { created_at: props.body.order === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.ecommerce_mall_notificationsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_notifications.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: effectiveLimit,
    ...EcommerceMallNotificationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_notifications.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallNotificationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: effectiveLimit,
      records: total,
      pages: Math.ceil(total / effectiveLimit),
    } satisfies IPage.IPagination,
  };
}
