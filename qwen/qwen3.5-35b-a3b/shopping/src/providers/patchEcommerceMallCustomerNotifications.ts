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
import { EcommerceMallNotificationTransformer } from "../transformers/EcommerceMallNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerNotifications(props: {
  customer: CustomerPayload;
  body: IEcommerceMallNotification.IRequest;
}): Promise<IPageIEcommerceMallNotification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? props.body.per_page ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_notification_recipientsWhereInput = {
    deleted_at: null,
    recipient_type: "customer",
    recipient_id: props.customer.id,
    notification: {
      deleted_at: null,
    },
    ...(props.body.read_status && {
      read_status: props.body.read_status,
    }),
    ...(props.body.type && {
      notification: {
        type: props.body.type,
      },
    }),
    ...(props.body.search && {
      notification: {
        OR: [
          { title: { contains: props.body.search, mode: "insensitive" } },
          { body: { contains: props.body.search, mode: "insensitive" } },
        ],
      },
    }),
    ...(props.body.created_at_from && {
      notification: {
        created_at: { gte: new Date(props.body.created_at_from) },
      },
    }),
    ...(props.body.created_at_to && {
      notification: {
        created_at: { lte: new Date(props.body.created_at_to) },
      },
    }),
  } satisfies Prisma.ecommerce_mall_notification_recipientsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_notification_recipientsOrderByWithRelationInput =
    {
      ...(props.body.sort === "read_at"
        ? { read_at: props.body.order === "asc" ? "asc" : "desc" }
        : props.body.sort === "title"
          ? {
              notification: {
                title: props.body.order === "asc" ? "asc" : "desc",
              },
            }
          : {
              notification: {
                created_at: props.body.order === "asc" ? "asc" : "desc",
              },
            }),
    } satisfies Prisma.ecommerce_mall_notification_recipientsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_notification_recipients.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      include: {
        notification: EcommerceMallNotificationTransformer.select(),
      } satisfies Prisma.ecommerce_mall_notification_recipientsInclude,
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_notification_recipients.count({
      where: whereInput,
    });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    async (rec) =>
      await EcommerceMallNotificationTransformer.transform(rec.notification),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallNotification.ISummary;
}
