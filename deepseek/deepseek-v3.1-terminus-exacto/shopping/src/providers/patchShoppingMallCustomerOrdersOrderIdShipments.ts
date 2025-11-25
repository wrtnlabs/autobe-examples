import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  // Verify the order exists and belongs to the authenticated customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // Build where conditions for shipments filtering
  const whereConditions: Record<string, unknown> = {
    shopping_mall_order_id: props.orderId,
  };

  // Apply search filter
  if (props.body.search) {
    whereConditions.OR = [
      { carrier: { contains: props.body.search, mode: "insensitive" } },
      { tracking_number: { contains: props.body.search, mode: "insensitive" } },
      { shipping_method: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Apply carrier filter
  if (props.body.carrier) {
    whereConditions.carrier = props.body.carrier;
  }

  // Apply status filter
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Apply shipping cost range filters
  if (
    props.body.min_shipping_cost !== undefined &&
    props.body.min_shipping_cost !== null
  ) {
    whereConditions.shipping_cost = {
      ...((whereConditions.shipping_cost as Record<string, unknown>) || {}),
      gte: props.body.min_shipping_cost,
    };
  }

  if (
    props.body.max_shipping_cost !== undefined &&
    props.body.max_shipping_cost !== null
  ) {
    whereConditions.shipping_cost = {
      ...((whereConditions.shipping_cost as Record<string, unknown>) || {}),
      lte: props.body.max_shipping_cost,
    };
  }

  // Apply estimated delivery date range filters
  if (props.body.min_estimated_delivery) {
    whereConditions.estimated_delivery = {
      ...((whereConditions.estimated_delivery as Record<string, unknown>) ||
        {}),
      gte: props.body.min_estimated_delivery,
    };
  }

  if (props.body.max_estimated_delivery) {
    whereConditions.estimated_delivery = {
      ...((whereConditions.estimated_delivery as Record<string, unknown>) ||
        {}),
      lte: props.body.max_estimated_delivery,
    };
  }

  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Determine order by field
  const orderByField = props.body.order_by ?? "created_at";
  const orderByDirection = props.body.direction ?? "desc";

  // Execute concurrent queries for data and total count
  const [shipments, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipments.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderByDirection },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_shipments.count({
      where: whereConditions,
    }),
  ]);

  // Transform results to API response format
  const data = shipments.map((shipment) => ({
    id: shipment.id,
    order: {
      id: shipment.order.id,
      order_number: shipment.order.order_number,
      total_amount: shipment.order.total_amount,
      subtotal_amount: shipment.order.subtotal_amount,
      tax_amount: shipment.order.tax_amount,
      shipping_amount: shipment.order.shipping_amount,
      currency: shipment.order.currency,
      status: shipment.order.status,
      shipping_address: shipment.order.shipping_address,
      billing_address: shipment.order.billing_address,
      created_at: toISOStringSafe(shipment.order.created_at),
      updated_at: toISOStringSafe(shipment.order.updated_at),
      customer: {
        id: shipment.order.customer.id,
        email: shipment.order.customer.email,
        first_name: shipment.order.customer.first_name,
        last_name: shipment.order.customer.last_name,
        phone_number: shipment.order.customer.phone_number ?? undefined,
        status: shipment.order.customer.status,
        created_at: toISOStringSafe(shipment.order.customer.created_at),
        updated_at: shipment.order.customer.updated_at
          ? toISOStringSafe(shipment.order.customer.updated_at)
          : undefined,
      },
    },
    carrier: shipment.carrier,
    tracking_number: shipment.tracking_number,
    shipping_method: shipment.shipping_method,
    shipping_cost: shipment.shipping_cost,
    status: shipment.status,
    estimated_delivery: shipment.estimated_delivery
      ? toISOStringSafe(shipment.estimated_delivery)
      : undefined,
    actual_delivery: shipment.actual_delivery
      ? toISOStringSafe(shipment.actual_delivery)
      : undefined,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
