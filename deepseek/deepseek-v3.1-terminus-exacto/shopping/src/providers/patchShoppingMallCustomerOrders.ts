import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  // Validate pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;

  // Build WHERE conditions
  const whereConditions: Record<string, unknown> = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
  };

  // Apply search filters
  if (
    props.body.status !== undefined &&
    props.body.status !== null &&
    props.body.status.trim() !== ""
  ) {
    whereConditions.status = props.body.status;
  }

  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.trim() !== ""
  ) {
    whereConditions.order_number = { contains: props.body.search };
  }

  // Date range filtering
  const dateConditions: Record<string, unknown> = {};
  if (props.body.date_from !== undefined && props.body.date_from !== null) {
    dateConditions.gte = props.body.date_from;
  }
  if (props.body.date_to !== undefined && props.body.date_to !== null) {
    dateConditions.lte = props.body.date_to;
  }
  if (Object.keys(dateConditions).length > 0) {
    whereConditions.created_at = dateConditions;
  }

  // Amount range filtering
  const amountConditions: Record<string, unknown> = {};
  if (props.body.min_amount !== undefined && props.body.min_amount !== null) {
    amountConditions.gte = props.body.min_amount;
  }
  if (props.body.max_amount !== undefined && props.body.max_amount !== null) {
    amountConditions.lte = props.body.max_amount;
  }
  if (Object.keys(amountConditions).length > 0) {
    whereConditions.total_amount = amountConditions;
  }

  // Build ORDER BY
  const orderBy: Record<string, "asc" | "desc"> = {};
  const orderField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order_direction ?? "desc";
  orderBy[orderField] = orderDirection;

  try {
    // Execute paginated query
    const [orders, total] = await Promise.all([
      MyGlobal.prisma.shopping_mall_orders.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: true,
        },
      }),
      MyGlobal.prisma.shopping_mall_orders.count({
        where: whereConditions,
      }),
    ]);

    // Format response
    const data = orders.map((order) => {
      // Handle customer relation safely
      const customerSummary: IShoppingMallCustomer.ISummary = {
        id: order.customer.id,
        email: order.customer.email,
        first_name: order.customer.first_name,
        last_name: order.customer.last_name,
        phone_number: order.customer.phone_number ?? undefined,
        status: order.customer.status,
        created_at: toISOStringSafe(order.customer.created_at),
        updated_at: order.customer.updated_at
          ? toISOStringSafe(order.customer.updated_at)
          : undefined,
      };

      return {
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        subtotal_amount: order.subtotal_amount,
        tax_amount: order.tax_amount,
        shipping_amount: order.shipping_amount,
        currency: order.currency,
        status: order.status,
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        created_at: toISOStringSafe(order.created_at),
        updated_at: toISOStringSafe(order.updated_at),
        customer: customerSummary,
      };
    });

    return {
      data,
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve customer orders", 500);
  }
}
