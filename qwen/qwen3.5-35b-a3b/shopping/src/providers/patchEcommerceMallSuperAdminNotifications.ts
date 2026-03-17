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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallNotificationAtSummaryTransformer } from "../transformers/EcommerceMallNotificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminNotifications(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallNotification.IRequest;
}): Promise<IPageIEcommerceMallNotification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.per_page ?? 100;
  const safeLimit = limit > 100 ? 100 : limit;
  const skip = (page - 1) * safeLimit;
  const whereInput: Prisma.ecommerce_mall_notificationsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { body: { contains: props.body.search } },
      ],
    }),
    ...(props.body.type && { type: props.body.type }),
    ...(props.body.read_status && { status: props.body.read_status }),
    ...(props.body.actor_type &&
      props.body.actor_id && {
        recipients: {
          some: {
            recipient_type: props.body.actor_type,
            recipient_id: props.body.actor_id,
            deleted_at: null,
          },
        },
      }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  };
  const orderByInput: Prisma.ecommerce_mall_notificationsOrderByWithRelationInput =
    (
      props.body.sort === "title"
        ? { title: props.body.order === "desc" ? "desc" : "asc" }
        : { created_at: props.body.order === "desc" ? "desc" : "asc" }
    ) satisfies Prisma.ecommerce_mall_notificationsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_notifications.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: safeLimit,
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
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
  };
}
