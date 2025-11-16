import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderNumber(props: {
  customer: CustomerPayload;
  orderNumber: string;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  // 1. Lookup order by business order_number and customer, not deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // 2. Patch fields - determine what can be changed. Always update 'status'.
  const patch: Record<string, unknown> = {
    status: props.body.status,
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.shopping_mall_address_id !== undefined) {
    patch.shopping_mall_address_id = props.body.shopping_mall_address_id;
  }
  if (props.body.shopping_mall_seller_id !== undefined) {
    patch.shopping_mall_seller_id = props.body.shopping_mall_seller_id;
  }
  if (props.body.total_amount !== undefined) {
    patch.total_amount = props.body.total_amount;
  }
  if (props.body.currency !== undefined) {
    patch.currency = props.body.currency;
  }
  // 3. Update the order
  const updated = await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: order.id },
    data: patch,
  });
  // 4. Reload relations (customer/address/seller)
  const [customer, address, seller] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: updated.shopping_mall_customer_id },
    }),
    MyGlobal.prisma.shopping_mall_addresses.findUnique({
      where: { id: updated.shopping_mall_address_id },
    }),
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: updated.shopping_mall_seller_id },
    }),
  ]);
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  if (!address) {
    throw new HttpException("Address not found", 404);
  }
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  // 5. Assemble result with strict type mapping (never return "as" or native Date).
  return {
    id: updated.id,
    order_number: updated.order_number,
    status: updated.status,
    total_amount: updated.total_amount,
    currency: updated.currency,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    customer: { id: customer.id, name: customer.name },
    address: {
      id: address.id,
      full_name: address.full_name,
      street: address.street,
      city: address.city,
      province: address.province,
      postal_code: address.postal_code,
      country: address.country,
      phone: address.phone,
      is_default: address.is_default,
    },
    seller: { id: seller.id, business_name: seller.business_name },
  };
}
