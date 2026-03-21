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
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrder.IUpdate;
}): Promise<IEcommerceMallOrder> {
  // Find the order and validate ownership
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      ecommerce_mall_customer_id: true,
      status: true,
    },
  });
  // Verify the customer owns this order
  if (order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if any order items have shipped or beyond status
  const shippedItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
      where: {
        ecommerce_mall_order_id: props.orderId,
        status: { in: ["shipped", "delivered"] },
      },
      select: { id: true },
    });
  if (shippedItems !== null) {
    throw new HttpException(
      "Cannot update shipping address after items have been shipped",
      400,
    );
  }
  // Validate and update shipping address if provided
  if (props.body.shipping_address_id !== undefined) {
    const address =
      await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirst({
        where: {
          id: props.body.shipping_address_id,
          ecommerce_mall_customer_id: props.customer.id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (address === null) {
      throw new HttpException(
        "Invalid shipping address or address does not belong to customer",
        400,
      );
    }
    // Update the order with new shipping address
    await MyGlobal.prisma.ecommerce_mall_orders.update({
      where: { id: props.orderId },
      data: {
        ecommerce_mall_shipping_address_id: props.body.shipping_address_id,
        updated_at: new Date(),
      },
    });
  }
  // Fetch the updated order with all relations
  const updatedOrder =
    await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      ...EcommerceMallOrderTransformer.select(),
    });
  return await EcommerceMallOrderTransformer.transform(updatedOrder);
}
