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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerShipments(props: {
  customer: CustomerPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_shipmentsWhereInput = {
    shopping_mall_order_id: props.customer.id,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.created_at_start && {
      shipped_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      shipped_at: { lte: new Date(props.body.created_at_end) },
    }),
  };
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where,
    skip,
    take: limit,
    orderBy: { shipped_at: "desc" },
    include: {
      order: {
        select: {
          id: true,
          total_price: true,
          status: true,
          created_at: true,
        },
      },
      seller: {
        select: {
          id: true,
          shop_name: true,
          approval_status: true,
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where,
  });
  return {
    data: data.map((shipment) => ({
      id: shipment.id,
      shoppingMallOrderId: shipment.shopping_mall_order_id,
      shoppingMallSellerId: shipment.shopping_mall_seller_id,
      trackingNumber: shipment.tracking_number,
      trackingCarrier: shipment.tracking_carrier,
      status: shipment.status,
      shippedAt: toISOStringSafe(shipment.shipped_at),
      customerConfirmedAt: shipment.customer_confirmed_at
        ? toISOStringSafe(shipment.customer_confirmed_at)
        : null,
      autoConfirmedAt: shipment.auto_confirmed_at
        ? toISOStringSafe(shipment.auto_confirmed_at)
        : null,
      cancelledAt: shipment.cancelled_at
        ? toISOStringSafe(shipment.cancelled_at)
        : null,
      order: {
        id: shipment.order.id,
        total_price: shipment.order.total_price,
        status: shipment.order.status,
        created_at: toISOStringSafe(shipment.order.created_at),
      },
      seller: {
        id: shipment.seller.id,
        shop_name: shipment.seller.shop_name,
        approval_status: shipment.seller.approval_status,
        created_at: toISOStringSafe(shipment.seller.created_at),
      },
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
