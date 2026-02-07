import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  // Find the order item with its related order information
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.body.order_item_id as string & tags.Format<"uuid"> },
    include: {
      order: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          shopping_mall_customer_id: true,
          total_amount: true,
          shipping_address: true,
          order_status: true,
        },
      },
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify the order item belongs to the authenticated seller
  if (orderItem.order?.shopping_mall_sellers_id !== props.seller.id) {
    throw new HttpException("Order item does not belong to this seller", 403);
  }
  // Create the shipment record
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_item_id: orderItem.id,
      shopping_mall_sellers_id: props.seller.id,
      status: "pending",
      customer_confirmed_delivery: false,
      shipping_address: orderItem.order.shipping_address,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // Return the created shipment record
  return {
    id: shipment.id,
    shopping_mall_order_item_id: shipment.shopping_mall_order_item_id,
    shopping_mall_sellers_id: shipment.shopping_mall_sellers_id,
    status: shipment.status,
    shipped_at: null,
    delivered_at: null,
    customer_confirmed_delivery: shipment.customer_confirmed_delivery,
    shipping_address: shipment.shipping_address,
    created_at: shipment.created_at,
    updated_at: shipment.updated_at,
  };
}
