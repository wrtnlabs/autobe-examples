import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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
    ...(props.body.status === "pending" && {
      delivered_at: null,
    }),
    ...(props.body.status === "delivered" && {
      delivered_at: {
        not: null,
      },
      delivery_confirmed: false,
    }),
    ...(props.body.status === "confirmed" && {
      delivery_confirmed: true,
    }),
    ...(props.body.shipped_at_from && {
      shipped_at: {
        gte: new Date(props.body.shipped_at_from),
      },
    }),
    ...(props.body.shipped_at_to && {
      shipped_at: {
        lte: new Date(props.body.shipped_at_to),
      },
    }),
    ...(props.body.delivered_at_from && {
      delivered_at: {
        gte: new Date(props.body.delivered_at_from),
      },
    }),
    ...(props.body.delivered_at_to && {
      delivered_at: {
        lte: new Date(props.body.delivered_at_to),
      },
    }),
    ...(props.body.tracking_carrier && {
      tracking_carrier: {
        contains: props.body.tracking_carrier,
        mode: "insensitive",
      },
    }),
    ...(props.body.tracking_number && {
      tracking_number: {
        contains: props.body.tracking_number,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
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
