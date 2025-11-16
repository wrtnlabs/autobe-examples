import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  // Check that order exists and belongs to customer
  const orderRecord = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.body.shopping_mall_order_id,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!orderRecord) {
    throw new HttpException("Order not found or not owned by customer.", 404);
  }

  // Check that seller exists
  const sellerRecord = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: props.body.shopping_mall_seller_id,
    },
  });
  if (!sellerRecord) {
    throw new HttpException("Seller not found.", 404);
  }

  // Check that customer exists (for summary, should always succeed for authenticated user)
  const customerRecord =
    await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: {
        id: props.customer.id,
      },
    });
  if (!customerRecord) {
    throw new HttpException("Customer not found.", 404);
  }

  const now = toISOStringSafe(new Date());
  const newId = v4();

  const created = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: {
      id: newId,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_seller_id: props.body.shopping_mall_seller_id,
      reason: props.body.reason,
      requested_amount: props.body.requested_amount,
      status: "pending",
      approved_amount: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      shopping_mall_admin_id: null,
    },
  });
  return {
    id: created.id,
    order: {
      id: orderRecord.id,
      order_number: orderRecord.order_number,
      status: orderRecord.status,
      total_amount: orderRecord.total_amount,
      currency: orderRecord.currency,
      created_at: toISOStringSafe(orderRecord.created_at),
      updated_at: toISOStringSafe(orderRecord.updated_at),
      deleted_at:
        orderRecord.deleted_at !== null && orderRecord.deleted_at !== undefined
          ? toISOStringSafe(orderRecord.deleted_at)
          : null,
    },
    customer: {
      id: customerRecord.id,
      name: customerRecord.name,
    },
    seller: {
      id: sellerRecord.id,
      business_name: sellerRecord.business_name,
    },
    admin: undefined,
    status: created.status,
    reason: created.reason,
    requested_amount: created.requested_amount,
    approved_amount: null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
