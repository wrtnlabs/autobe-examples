import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function patchShoppingMallCustomerShipmentsShipmentIdConfirmDelivery(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  // Find the shipment and verify it belongs to the customer
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      // deleted_at: null, // Removed - field doesn't exist in shopping_mall_shipmentsWhereInput
      orderItem: {
        order: {
          customer: {
            id: props.customer.id,
          },
        },
      },
    },
    include: {
      orderItem: {
        include: {
          order: true,
        },
      },
    },
  });
  if (!shipment) {
    throw new HttpException(
      "Shipment not found or does not belong to customer",
      404,
    );
  }
  // Verify shipment status is 'shipped' (can only confirm shipped items)
  if (shipment.status !== "shipped") {
    throw new HttpException("Shipment is not in shipped status", 400);
  }
  // Update shipment with delivery confirmation
  const updatedShipment = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      status: "delivered",
      delivered_at: toISOStringSafe(new Date()),
      customer_confirmed_delivery: true,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Transform database record to response DTO
  return {
    id: updatedShipment.id as string & tags.Format<"uuid">,
    shopping_mall_order_item_id:
      updatedShipment.shopping_mall_order_item_id as string &
        tags.Format<"uuid">,
    shopping_mall_sellers_id:
      updatedShipment.shopping_mall_sellers_id as string & tags.Format<"uuid">,
    carrier_name:
      updatedShipment.carrier_name === null
        ? undefined
        : updatedShipment.carrier_name,
    tracking_number:
      updatedShipment.tracking_number === null
        ? undefined
        : updatedShipment.tracking_number,
    status: updatedShipment.status,
    shipped_at: updatedShipment.shipped_at
      ? (toISOStringSafe(updatedShipment.shipped_at) as string &
          tags.Format<"date-time">)
      : undefined,
    delivered_at: updatedShipment.delivered_at
      ? (toISOStringSafe(updatedShipment.delivered_at) as string &
          tags.Format<"date-time">)
      : undefined,
    customer_confirmed_delivery: updatedShipment.customer_confirmed_delivery,
    shipping_address: updatedShipment.shipping_address,
    created_at: toISOStringSafe(updatedShipment.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updatedShipment.updated_at) as string &
      tags.Format<"date-time">,
  };
}
