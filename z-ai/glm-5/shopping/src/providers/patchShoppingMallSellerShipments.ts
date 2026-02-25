import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipment";
import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderShipmentAtSummaryTransformer } from "../transformers/ShoppingMallOrderShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderShipment.IRequest;
}): Promise<IPageIShoppingMallOrderShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.status === "shipped" && { delivered_at: null }),
    ...(props.body.status === "delivered" && { delivered_at: { not: null } }),
    ...(props.body.carrierName && {
      carrier_name: {
        contains: props.body.carrierName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.trackingNumber && {
      tracking_number: {
        contains: props.body.trackingNumber,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.customerName && {
      items: {
        some: {
          orderItem: {
            order: {
              customer: {
                display_name: {
                  contains: props.body.customerName,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
    }),
    ...(props.body.shippedAtFrom || props.body.shippedAtTo
      ? {
          shipped_at: {
            ...(props.body.shippedAtFrom && {
              gte: new Date(props.body.shippedAtFrom),
            }),
            ...(props.body.shippedAtTo && {
              lte: new Date(props.body.shippedAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.deliveredAtFrom !== undefined ||
    props.body.deliveredAtTo !== undefined
      ? {
          delivered_at: {
            ...(props.body.deliveredAtFrom !== undefined &&
              props.body.deliveredAtFrom !== null && {
                gte: new Date(props.body.deliveredAtFrom),
              }),
            ...(props.body.deliveredAtTo !== undefined &&
              props.body.deliveredAtTo !== null && {
                lte: new Date(props.body.deliveredAtTo),
              }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_order_shipmentsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_order_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { shipped_at: "desc" as const },
    ...ShoppingMallOrderShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_order_shipments.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderShipmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
