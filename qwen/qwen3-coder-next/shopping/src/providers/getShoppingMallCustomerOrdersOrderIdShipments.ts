import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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

export async function getShoppingMallCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string;
}): Promise<IPageIShoppingMallShipment> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Find all order items belonging to this order
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_id: props.orderId,
    },
    select: { id: true },
  });
  // Find shipments for these order items with pagination
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: {
      shopping_mall_order_item_id: { in: orderItems.map((item) => item.id) },
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: {
      shopping_mall_order_item_id: { in: orderItems.map((item) => item.id) },
    },
  });
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      shopping_mall_order_item_id: record.shopping_mall_order_item_id,
      shopping_mall_sellers_id: record.shopping_mall_sellers_id,
      carrier_name: record.carrier_name,
      tracking_number: record.tracking_number,
      status: record.status,
      shipped_at: record.shipped_at ? toISOStringSafe(record.shipped_at) : null,
      delivered_at: record.delivered_at
        ? toISOStringSafe(record.delivered_at)
        : null,
      customer_confirmed_delivery: record.customer_confirmed_delivery,
      shipping_address: record.shipping_address,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
