import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminShipments(props: {
  admin: AdminPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.seller_id !== undefined && {
      shopping_mall_seller_id: props.body.seller_id,
    }),
    ...(props.body.order_id !== undefined && {
      shopping_mall_order_id: props.body.order_id,
    }),
    ...(props.body.carrier_name !== undefined && {
      carrier_name: {
        contains: props.body.carrier_name,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.tracking_number !== undefined && {
      tracking_number: {
        contains: props.body.tracking_number,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.shipped_from !== undefined && {
      shipped_at: { gte: new Date(props.body.shipped_from) },
    }),
    ...(props.body.shipped_to !== undefined && {
      shipped_at: { lte: new Date(props.body.shipped_to) },
    }),
    ...(props.body.delivered_from !== undefined && {
      delivered_at: { not: null, gte: new Date(props.body.delivered_from) },
    }),
    ...(props.body.delivered_to !== undefined && {
      delivered_at: { not: null, lte: new Date(props.body.delivered_to) },
    }),
    ...(props.body.is_delivered !== undefined && {
      delivered_at: props.body.is_delivered ? { not: null } : null,
    }),
    ...(props.body.search !== undefined && {
      OR: [
        {
          carrier_name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          tracking_number: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { shipped_at: "desc" },
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallShipmentAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallShipment.ISummary;
}
