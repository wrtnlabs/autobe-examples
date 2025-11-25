import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderReturn";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function patchShoppingMallOrdersOrderNumberReturns(props: {
  orderNumber: string;
}): Promise<IPageIShoppingMallOrderReturn.ISummary> {
  // Find order by order_number
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { order_number: props.orderNumber },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Get count of returns for this order
  const total = await MyGlobal.prisma.shopping_mall_order_returns.count({
    where: { shopping_mall_order_id: order.id },
  });

  // Default pagination parameters
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  // Fetch returns for this order
  const returns = await MyGlobal.prisma.shopping_mall_order_returns.findMany({
    where: { shopping_mall_order_id: order.id },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      shopping_mall_order_id: true,
      return_reason: true,
      return_details: true,
      return_status: true,
      refund_amount: true,
      return_method: true,
      return_tracking_number: true,
      return_tracking_url: true,
      approved_by_admin_id: true,
      approved_at: true,
      received_at: true,
      refund_processed_at: true,
    },
  });

  // Transform to API DTO
  const data = await Promise.all(
    returns.map(async (returnRecord) => {
      // Get order details
      const orderDetails =
        await MyGlobal.prisma.shopping_mall_orders.findUnique({
          where: { id: returnRecord.shopping_mall_order_id },
          select: {
            order_number: true,
            total_amount: true,
            currency: true,
            status: true,
            created_at: true,
            shopping_mall_customer_id: true,
            shopping_mall_seller_id: true,
          },
        });

      if (!orderDetails) {
        throw new HttpException("Order not found for return", 404);
      }

      // Get customer details
      const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique(
        {
          where: { id: orderDetails.shopping_mall_customer_id },
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            created_at: true,
            status: true,
          },
        },
      );

      if (!customer) {
        throw new HttpException("Customer not found for return", 404);
      }

      // Get seller details
      const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
        where: { id: orderDetails.shopping_mall_seller_id },
        select: {
          business_name: true,
        },
      });

      // Transform to API DTO
      return {
        id: returnRecord.id,
        status: returnRecord.return_status,
        reason: returnRecord.return_reason,
        return_amount: returnRecord.refund_amount,
        order_reference: {
          order_number: orderDetails.order_number,
          total_amount: orderDetails.total_amount,
          currency: orderDetails.currency,
          status: orderDetails.status,
          created_at: toISOStringSafe(orderDetails.created_at),
        },
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.first_name + " " + customer.last_name,
          created_at: toISOStringSafe(customer.created_at),
          status: customer.status,
        },
        seller: seller?.business_name ?? "",
        created_at: toISOStringSafe(returnRecord.created_at),
      };
    }),
  );

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
