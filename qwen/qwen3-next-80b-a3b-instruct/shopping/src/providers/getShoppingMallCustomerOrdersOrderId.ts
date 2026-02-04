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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
    },
    select: {
      id: true,
      customer_id: true,
      orderItems: true,
      shipments: true,
      shippingAddress: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or not authorized", 404);
  }
  // Parse shippingAddress JSON string to IShoppingMallCustomerAddress
  let shippingAddress: IShoppingMallCustomerAddress | null = null;
  if (order.shippingAddress) {
    try {
      const addressJson = JSON.parse(order.shippingAddress as string);
      shippingAddress = {
        recipientName: addressJson.recipientName || "",
        streetAddress: addressJson.streetAddress || "",
        city: addressJson.city || "",
        stateProvince: addressJson.stateProvince || undefined,
        postalCode: addressJson.postalCode || "",
        country: addressJson.country || "",
        phoneNumber: addressJson.phoneNumber || undefined,
        isDefault: addressJson.isDefault || undefined,
      };
    } catch (error) {
      // Fallback if JSON parsing fails
      shippingAddress = {
        recipientName: "",
        streetAddress: "",
        city: "",
        postalCode: "",
        country: "",
        stateProvince: undefined,
        phoneNumber: undefined,
        isDefault: undefined,
      };
    }
  } else {
    // Fallback if shippingAddress is null
    shippingAddress = {
      recipientName: "",
      streetAddress: "",
      city: "",
      postalCode: "",
      country: "",
      stateProvince: undefined,
      phoneNumber: undefined,
      isDefault: undefined,
    };
  }
  // Convert orderItems and shipments to JSON strings as required by the API contract
  return {
    customerId: order.customer_id,
    id: order.id,
    orderItems: JSON.stringify(order.orderItems), // Convert array to JSON string
    shipments: JSON.stringify(order.shipments), // Convert array to JSON string
    shippingAddress: shippingAddress || {
      recipientName: "",
      streetAddress: "",
      city: "",
      postalCode: "",
      country: "",
      stateProvince: undefined,
      phoneNumber: undefined,
      isDefault: undefined,
    },
  };
}
