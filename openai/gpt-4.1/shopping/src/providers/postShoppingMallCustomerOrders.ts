import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  // 1. Validate order_number uniqueness
  const orderExists = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: { order_number: props.body.order_number },
  });
  if (orderExists !== null) {
    throw new HttpException("order_number already exists", 400);
  }

  // 2. Ensure referenced customer exists
  const customerRecord =
    await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: props.body.shopping_mall_customer_id },
    });
  if (customerRecord === null) {
    throw new HttpException("Referenced customer does not exist", 404);
  }

  // 3. Ensure referenced address exists
  const addressRecord =
    await MyGlobal.prisma.shopping_mall_addresses.findUnique({
      where: { id: props.body.shopping_mall_address_id },
    });
  if (addressRecord === null) {
    throw new HttpException("Referenced address does not exist", 404);
  }

  // 4. Ensure referenced seller exists
  const sellerRecord = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.body.shopping_mall_seller_id },
  });
  if (sellerRecord === null) {
    throw new HttpException("Referenced seller does not exist", 404);
  }

  // 5. Validate total_amount
  if (
    typeof props.body.total_amount !== "number" ||
    props.body.total_amount < 0
  ) {
    throw new HttpException(
      "Invalid total_amount (must be non-negative number)",
      400,
    );
  }

  // 6. Insert the order
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_orders.create({
    data: {
      id: v4(),
      order_number: props.body.order_number,
      shopping_mall_customer_id: props.body.shopping_mall_customer_id,
      shopping_mall_address_id: props.body.shopping_mall_address_id,
      shopping_mall_seller_id: props.body.shopping_mall_seller_id,
      status: props.body.status,
      total_amount: props.body.total_amount,
      currency: props.body.currency,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 7. Summaries for customer
  const customerSummary = {
    id: customerRecord.id,
    name: customerRecord.name,
  };
  // 8. Address summary
  const addressSummary = {
    id: addressRecord.id,
    full_name: addressRecord.full_name,
    street: addressRecord.street,
    city: addressRecord.city,
    province: addressRecord.province,
    postal_code: addressRecord.postal_code,
    country: addressRecord.country,
    phone: addressRecord.phone,
    is_default: addressRecord.is_default,
  };
  // 9. Seller summary
  const sellerSummary = {
    id: sellerRecord.id,
    business_name: sellerRecord.business_name,
  };
  // 10. Return strict DTO (no as, correct types)
  return {
    id: created.id,
    order_number: created.order_number,
    status: created.status,
    total_amount: created.total_amount,
    currency: created.currency,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
    customer: customerSummary,
    address: addressSummary,
    seller: sellerSummary,
  };
}
