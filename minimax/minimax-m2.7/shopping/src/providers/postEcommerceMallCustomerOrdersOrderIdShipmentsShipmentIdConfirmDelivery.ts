import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerOrdersOrderIdShipmentsShipmentIdConfirmDelivery(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipment> {
  // 1. Verify order exists and belongs to authenticated customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true, ecommerce_mall_customer_id: true },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify shipment exists and belongs to the order
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { id: true, ecommerce_mall_order_id: true },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.ecommerce_mall_order_id !== props.orderId) {
    throw new HttpException("Shipment not found", 404);
  }
  // 3. Find all shipment items linked to this shipment
  const shipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where: { ecommerce_mall_shipment_id: props.shipmentId },
      select: { ecommerce_mall_order_item_id: true },
    });
  const orderItemIds = shipmentItems.map(
    (item) => item.ecommerce_mall_order_item_id,
  );
  // 4. Check order items statuses
  if (orderItemIds.length > 0) {
    const orderItems =
      await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
        where: { id: { in: orderItemIds } },
        select: { id: true, status: true },
      });
    const allDelivered = orderItems.every(
      (item) => item.status === "delivered",
    );
    const hasNonShippedItems = orderItems.some(
      (item) => item.status !== "shipped",
    );
    if (allDelivered) {
      // Already delivered - return success without making changes
      const existingShipment =
        await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
          where: { id: props.shipmentId },
          ...EcommerceMallShipmentTransformer.select(),
        });
      return await EcommerceMallShipmentTransformer.transform(existingShipment);
    }
    if (hasNonShippedItems) {
      throw new HttpException(
        "Cannot confirm delivery: some items are not in shipped status",
        400,
      );
    }
    // 5. Update all order items to 'delivered' status
    await MyGlobal.prisma.ecommerce_mall_order_items.updateMany({
      where: { id: { in: orderItemIds } },
      data: {
        status: "delivered",
        updated_at: new Date(),
      },
    });
  }
  // 6. Return the updated shipment with all order items
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(updatedShipment);
}
