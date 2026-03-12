import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCustomersMeOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  // Validate customer exists and is active
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: {
        id: props.customer.id,
        deleted_at: null,
        status: "active",
      },
      select: {
        display_name: true,
        phone_number: true,
      },
    });
  // Create shipping address snapshot using customer data
  // (no shopping_mall_addresses table exists in schema)
  const shippingAddressSnapshot = JSON.stringify({
    recipientName: customer.display_name,
    phoneNumber: customer.phone_number ?? "",
    streetAddress: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    country: "",
  });
  // Create order with minimal data
  const order = await MyGlobal.prisma.shopping_mall_orders.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: props.customer.id,
      shipping_address_snapshot: shippingAddressSnapshot,
      total_price: 0,
      status: "paid",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...ShoppingMallOrderTransformer.select(),
  });
  return await ShoppingMallOrderTransformer.transform(order);
}
