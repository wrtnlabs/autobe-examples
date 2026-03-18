import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderTrackingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderTrackingItem";
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

export async function getShoppingMallCustomerOrdersOrderIdTracking(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderTrackingItem> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const shipments = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: {
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
    orderBy: {
      created_at: "asc",
    },
    select: {
      carrier_name: true,
      tracking_number: true,
      status: true,
      shipped_at: true,
      delivered_at: true,
    },
  });
  return {
    shipments: shipments.map((shipment) => ({
      carrier_name: shipment.carrier_name,
      tracking_number: shipment.tracking_number,
      status: shipment.status,
      shipped_at: shipment.shipped_at?.toISOString() ?? null,
      delivered_at: shipment.delivered_at?.toISOString() ?? null,
    })) as any,
  };
}
