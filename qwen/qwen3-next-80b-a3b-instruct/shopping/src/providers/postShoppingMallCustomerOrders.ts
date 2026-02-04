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
import { ShoppingMallOrderCollector } from "../collectors/ShoppingMallOrderCollector";

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  const collected = await ShoppingMallOrderCollector.collect({
    body: props.body,
    shoppingMallCustomers: { id: props.customer.id },
    shoppingMallCustomerSessions: { id: props.customer.session_id },
  });
  const created = await MyGlobal.prisma.shopping_mall_orders.create({
    data: collected,
  });
  // Extract shipping address from the JSON field in shopping_mall_orders
  let shippingAddress: IShoppingMallCustomerAddress;
  if (created.shippingAddress) {
    try {
      const addressJson = JSON.parse(created.shippingAddress);
      shippingAddress = {
        recipientName: addressJson.recipientName,
        streetAddress: addressJson.streetAddress,
        city: addressJson.city,
        stateProvince: addressJson.stateProvince ?? undefined,
        postalCode: addressJson.postalCode,
        country: addressJson.country,
        phoneNumber: addressJson.phoneNumber ?? undefined,
        isDefault: addressJson.isDefault ?? undefined,
      };
    } catch (error) {
      // Fallback in case JSON parsing fails
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
    // Fallback if shippingAddress is null or undefined
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
  // Construct the full IShoppingMallOrder structure
  const fullOrder: IShoppingMallOrder = {
    customerId: created.customer_id as string & tags.Format<"uuid">,
    id: created.id,
    shippingAddress: shippingAddress,
    orderItems: "[]",
    shipments: "[]",
  };
  return fullOrder;
}
