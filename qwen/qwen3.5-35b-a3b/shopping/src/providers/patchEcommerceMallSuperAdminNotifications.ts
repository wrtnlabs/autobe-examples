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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { EcommerceMallNotificationAtSummaryTransformer } from "../transformers/EcommerceMallNotificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminNotifications(props: {
  superAdmin: SuperAdminPayload;
  body: IEcommerceMallNotification.IRequest;
}): Promise<IPageIEcommerceMallNotification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.per_page ?? 100;
  const skip = (page - 1) * limit;
  const searchWhere = props.body.search
    ? {
        OR: [
          {
            title: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            body: { contains: props.body.search, mode: "insensitive" as const },
          },
        ],
      }
    : undefined;
  const whereInput: Prisma.ecommerce_mall_notificationsWhereInput = {
    deleted_at: null,
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.actor_id && { actor_id: props.body.actor_id }),
    ...(props.body.read_status && { status: props.body.read_status }),
    ...(props.body.type && { type: props.body.type }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.search && searchWhere),
  };
  const orderByInput: Prisma.ecommerce_mall_notificationsOrderByWithRelationInput =
    props.body.sort === "title"
      ? {
          title:
            props.body.order === "asc" ? ("asc" as const) : ("desc" as const),
        }
      : {
          created_at:
            props.body.order === "asc" ? ("asc" as const) : ("desc" as const),
        };
  const data = await MyGlobal.prisma.ecommerce_mall_notifications.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallNotificationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_notifications.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallNotificationAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallNotification.ISummary;
}
