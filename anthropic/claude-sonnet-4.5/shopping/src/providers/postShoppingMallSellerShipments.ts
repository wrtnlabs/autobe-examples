import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  const { seller, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: body.shopping_mall_order_id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only create shipments for your own orders",
      403,
    );
  }

  const validShippingStatuses = [
    "confirmed",
    "processing",
    "preparing_shipment",
  ];
  if (!validShippingStatuses.includes(order.status)) {
    throw new HttpException(
      `Order must be in confirmed, processing, or preparing_shipment status to create shipment. Current status: ${order.status}`,
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  const shipmentId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_shipments.create({
    data: {
      id: shipmentId,
      shopping_mall_order_id: body.shopping_mall_order_id,
      created_by_seller_id: seller.id,
      carrier_name: body.carrier_name,
      tracking_number: body.tracking_number,
      shipping_method: order.shipping_method,
      shipment_status: "label_created",
      shipped_at: now,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    tracking_number: created.tracking_number,
  };
}
