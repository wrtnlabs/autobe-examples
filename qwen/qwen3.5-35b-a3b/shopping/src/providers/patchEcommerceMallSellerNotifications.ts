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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallNotificationAtSummaryTransformer } from "../transformers/EcommerceMallNotificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerNotifications(props: {
  seller: SellerPayload;
  body: IEcommerceMallNotification.IRequest;
}): Promise<IPageIEcommerceMallNotification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? props.body.per_page ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.ecommerce_mall_notificationsWhereInput = {
    deleted_at: null,
    recipients: {
      some: {
        recipient_type: "seller",
        recipient_id: props.seller.id,
        deleted_at: null,
      },
    },
    ...(props.body.read_status && {
      status: props.body.read_status,
    }),
    ...(props.body.type && {
      type: props.body.type,
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
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { body: { contains: props.body.search } },
      ],
    }),
  };
  // Build orderBy
  const orderByInput =
    ((): Prisma.ecommerce_mall_notificationsOrderByWithRelationInput[] => {
      if (props.body.sort === "title") {
        return [
          {
            title: (props.body.order ?? "asc") as "asc" | "desc",
          },
        ];
      }
      return [
        {
          created_at: (props.body.order ?? "desc") as "asc" | "desc",
        },
      ];
    })();
  // Get paginated data
  const data = await MyGlobal.prisma.ecommerce_mall_notifications.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallNotificationAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_notifications.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallNotificationAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
