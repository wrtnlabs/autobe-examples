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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  // 1. Verify customer owns the order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { shopping_mall_customer_id: true },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Build where clause from filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    order_id: props.orderId,
    deleted_at: null,
    ...(props.body.delivered === true && { delivered_at: { not: null } }),
    ...(props.body.delivered === false && { delivered_at: null }),
    ...(props.body.sellerId && { seller_id: props.body.sellerId }),
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
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  // 3. Get paginated results
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { shipped_at: "desc" as const },
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: whereInput,
  });
  // 4. Transform and return
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
