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
    seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.orderId && { order_id: props.body.orderId }),
    ...(props.body.carrierName && {
      carrier_name: {
        contains: props.body.carrierName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.trackingNumber && {
      tracking_number: props.body.trackingNumber,
    }),
    ...(props.body.shippedFrom || props.body.shippedTo
      ? {
          shipped_at: {
            ...(props.body.shippedFrom && {
              gte: new Date(props.body.shippedFrom),
            }),
            ...(props.body.shippedTo && {
              lte: new Date(props.body.shippedTo),
            }),
          },
        }
      : {}),
    ...(props.body.deliveredFrom || props.body.deliveredTo
      ? {
          delivered_at: {
            ...(props.body.deliveredFrom && {
              gte: new Date(props.body.deliveredFrom),
            }),
            ...(props.body.deliveredTo && {
              lte: new Date(props.body.deliveredTo),
            }),
          },
        }
      : {}),
    ...(props.body.createdFrom || props.body.createdTo
      ? {
          created_at: {
            ...(props.body.createdFrom && {
              gte: new Date(props.body.createdFrom),
            }),
            ...(props.body.createdTo && {
              lte: new Date(props.body.createdTo),
            }),
          },
        }
      : {}),
    ...(props.body.delivered === true && { delivered_at: { not: null } }),
    ...(props.body.delivered === false && { delivered_at: null }),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallShipmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_shipments.count({ where: whereInput }),
  ]);
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
