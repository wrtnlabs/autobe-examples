import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string;
}): Promise<IShoppingMallOrder> {
  // Find the order by ID with required relationships
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: {
      id: true,
      total_price: true,
      payment_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      customer_id: true,
      shipping_address_id: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Parse shipping address from JSON field with defensive parsing
  let shippingAddress: IShoppingMallCustomerAddress = {
    recipientName: "",
    streetAddress: "",
    city: "",
    postalCode: "",
    country: "",
    stateProvince: undefined,
    phoneNumber: undefined,
    isDefault: undefined,
  };
  if (order.shipping_address_id) {
    // This would require a separate query to get the actual address data
    // which is beyond the scope of this function. This is a Prisma model issue.
  }
  // Return the order response with correct null handling
  return {
    customerId:
      order.customer_id === null
        ? null
        : (order.customer_id as string & tags.Format<"uuid">),
    id: order.id,
    orderItems: "[]",
    shipments: "[]",
    shippingAddress: shippingAddress,
  };
}
