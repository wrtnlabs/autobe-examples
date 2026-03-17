import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "oldest" &&
    props.body.sort !== "shipped_at_asc" &&
    props.body.sort !== "shipped_at_desc" &&
    props.body.sort !== "newest"
  ) {
    throw new HttpException("Invalid sort", 400);
  }
  const whereInput = {
    deleted_at: null,
    shopping_mall_seller_id: props.seller.id,
    order: {
      is: {
        deleted_at: null,
        ...(props.body.orderCode !== undefined && {
          code: props.body.orderCode,
        }),
      },
    },
    ...(props.body.id !== undefined && {
      id: props.body.id,
    }),
    ...(props.body.shopping_mall_order_id !== undefined && {
      shopping_mall_order_id: props.body.shopping_mall_order_id,
    }),
    ...(props.body.delivered !== undefined &&
      (props.body.delivered === true
        ? {
            delivered_at: {
              not: null,
            },
          }
        : {
            delivered_at: null,
          })),
    ...((props.body.shippedFrom !== undefined ||
      props.body.shippedTo !== undefined) && {
      shipped_at: {
        ...(props.body.shippedFrom !== undefined && {
          gte: new Date(props.body.shippedFrom),
        }),
        ...(props.body.shippedTo !== undefined && {
          lte: new Date(props.body.shippedTo),
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  const orderByInput = (
    props.body.sort === "oldest"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "shipped_at_asc"
        ? [{ shipped_at: "asc" }, { id: "asc" }]
        : props.body.sort === "shipped_at_desc"
          ? [{ shipped_at: "desc" }, { id: "desc" }]
          : [{ created_at: "desc" }, { id: "desc" }]
  ) satisfies Prisma.shopping_mall_shipmentsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallShipmentAtSummaryTransformer.transform,
    ),
  };
}
