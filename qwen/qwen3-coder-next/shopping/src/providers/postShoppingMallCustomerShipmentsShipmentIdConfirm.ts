import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDeliveryConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderDeliveryConfirmationAtResponseTransformer } from "../transformers/ShoppingMallOrderDeliveryConfirmationAtResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerShipmentsShipmentIdConfirm(props: {
  customer: CustomerPayload;
  shipmentId: string;
}): Promise<IShoppingMallOrderDeliveryConfirmation.IResponse> {
  // Check if delivery confirmation already exists
  const existingConfirmation =
    await MyGlobal.prisma.shopping_mall_order_delivery_confirmations.findFirst({
      where: {
        shopping_mall_shipment_id: props.shipmentId as string &
          tags.Format<"uuid">,
      },
      include: {
        orderItem: true,
        shipment: true,
      },
    });
  if (existingConfirmation) {
    const confirmedAt =
      existingConfirmation.customer_confirmed_at ??
      existingConfirmation.auto_confirmed_at ??
      existingConfirmation.created_at;
    return {
      shipment_id: existingConfirmation.shipment.id as string &
        tags.Format<"uuid">,
      order_item_id: existingConfirmation.orderItem.id as string &
        tags.Format<"uuid">,
      confirmed_at: confirmedAt?.toISOString() ?? "",
    };
  }
  // Find shipment with related order and items
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId as string & tags.Format<"uuid"> },
      include: {
        order: {
          include: {
            orderItems: true,
          },
        },
      },
    });
  // Get first order item from shipment's order
  const firstItem = shipment.order.orderItems[0];
  if (!firstItem) {
    throw new HttpException("No order items found in shipment", 400);
  }
  // Create delivery confirmation record
  const confirmation =
    await MyGlobal.prisma.shopping_mall_order_delivery_confirmations.create({
      data: {
        id: v4(),
        shopping_mall_order_item_id: firstItem.id,
        shopping_mall_shipment_id: props.shipmentId,
        confirmed_by_ip: "127.0.0.1",
        referrer: null,
        customer_confirmed_at: null,
        auto_confirmed_at: null,
        created_at: new Date(),
      },
      include: {
        orderItem: true,
        shipment: true,
      },
    });
  // Use transformer for response construction
  return await ShoppingMallOrderDeliveryConfirmationAtResponseTransformer.transform(
    confirmation,
  );
}
