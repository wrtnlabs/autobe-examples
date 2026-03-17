import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    seller_id: props.seller.id,
    ...(props.body.orderId !== undefined && { order_id: props.body.orderId }),
    ...(props.body.carrierName !== undefined && {
      carrier_name: {
        contains: props.body.carrierName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.status !== undefined && {
      delivered_at:
        props.body.status === "pending_delivery" ? null : { not: null },
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
    ...(props.body.shippedFrom !== undefined &&
      props.body.shippedFrom !== null && {
        shipped_at: { gte: new Date(props.body.shippedFrom) },
      }),
    ...(props.body.shippedTo !== undefined &&
      props.body.shippedTo !== null && {
        shipped_at: { lte: new Date(props.body.shippedTo) },
      }),
    ...(props.body.deliveredFrom !== undefined &&
      props.body.deliveredFrom !== null && {
        delivered_at: { gte: new Date(props.body.deliveredFrom) },
      }),
    ...(props.body.deliveredTo !== undefined &&
      props.body.deliveredTo !== null && {
        delivered_at: { lte: new Date(props.body.deliveredTo) },
      }),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallShipmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
