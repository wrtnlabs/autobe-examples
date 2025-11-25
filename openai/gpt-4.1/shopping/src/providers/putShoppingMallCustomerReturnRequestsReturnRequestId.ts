import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnRequest";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerReturnRequestsReturnRequestId(props: {
  customer: CustomerPayload;
  returnRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallReturnRequest.IUpdate;
}): Promise<IShoppingMallReturnRequest> {
  const record = await MyGlobal.prisma.shopping_mall_return_requests.findFirst({
    where: {
      id: props.returnRequestId,
      deleted_at: null,
    },
  });
  if (!record) {
    throw new HttpException("Return request not found", 404);
  }
  if (record.requested_by_customer_id !== props.customer.id) {
    throw new HttpException(
      "You are not authorized to update this request.",
      403,
    );
  }

  const immutableStatuses = ["completed", "cancelled"];
  if (immutableStatuses.includes(record.status)) {
    if (
      typeof props.body.status === "string" &&
      props.body.status !== record.status
    ) {
      throw new HttpException(
        `Cannot change status after request is completed or cancelled`,
        400,
      );
    }
  }

  const allowedStatuses = [
    "pending",
    "approved",
    "scheduled",
    "picked_up",
    "delivered",
    "completed",
    "rejected",
    "cancelled",
  ];
  if (
    props.body.status !== undefined &&
    !allowedStatuses.includes(props.body.status)
  ) {
    throw new HttpException(`Invalid status value: ${props.body.status}`, 400);
  }

  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.reason !== undefined) updateData.reason = props.body.reason;
  if (props.body.status !== undefined) updateData.status = props.body.status;
  if ("pickup_address" in props.body)
    updateData.pickup_address = props.body.pickup_address ?? null;
  if ("scheduled_pickup_at" in props.body)
    updateData.scheduled_pickup_at = props.body.scheduled_pickup_at ?? null;
  if ("provider_tracking_code" in props.body)
    updateData.provider_tracking_code =
      props.body.provider_tracking_code ?? null;
  if ("shipping_partner_id" in props.body)
    updateData.shipping_partner_id = props.body.shipping_partner_id ?? null;

  if (props.body.status === "completed") {
    updateData.completed_at = toISOStringSafe(new Date());
  }
  if (props.body.status === "cancelled") {
    updateData.cancelled_at = toISOStringSafe(new Date());
  }

  const updated = await MyGlobal.prisma.shopping_mall_return_requests.update({
    where: { id: props.returnRequestId },
    data: updateData,
  });

  const [
    order,
    orderItem,
    requestedByCustomer,
    requestedBySeller,
    shippingPartner,
  ] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findUnique({
      where: { id: updated.order_id },
    }),
    MyGlobal.prisma.shopping_mall_order_items.findUnique({
      where: { id: updated.order_item_id },
    }),
    updated.requested_by_customer_id
      ? MyGlobal.prisma.shopping_mall_customers.findUnique({
          where: { id: updated.requested_by_customer_id },
        })
      : Promise.resolve(undefined),
    updated.requested_by_seller_id
      ? MyGlobal.prisma.shopping_mall_sellers.findUnique({
          where: { id: updated.requested_by_seller_id },
        })
      : Promise.resolve(undefined),
    updated.shipping_partner_id
      ? MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
          where: { id: updated.shipping_partner_id },
        })
      : Promise.resolve(undefined),
  ]);

  if (!order)
    throw new HttpException("Corrupted: Related order not found.", 500);
  if (!orderItem)
    throw new HttpException("Corrupted: Related order item not found.", 500);

  return {
    id: updated.id,
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at:
        order.deleted_at !== null && order.deleted_at !== undefined
          ? toISOStringSafe(order.deleted_at)
          : undefined,
    },
    orderItem: {
      id: orderItem.id,
      shopping_mall_order_id: orderItem.shopping_mall_order_id,
      sku: {
        id: orderItem.shopping_mall_product_sku_id,
        code: "",
        product_title: "",
        option_summary: "",
        in_stock: true,
      },
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
      subtotal: orderItem.subtotal,
      currency: orderItem.currency,
      delivered: orderItem.delivered,
      refunded: orderItem.refunded,
      created_at: toISOStringSafe(orderItem.created_at),
      updated_at: toISOStringSafe(orderItem.updated_at),
    },
    requestedByCustomer: requestedByCustomer
      ? {
          id: requestedByCustomer.id,
          name: requestedByCustomer.name,
        }
      : undefined,
    requestedBySeller: requestedBySeller
      ? {
          id: requestedBySeller.id,
          business_name: requestedBySeller.business_name,
        }
      : undefined,
    shippingPartner: shippingPartner
      ? {
          id: shippingPartner.id,
          partner_name: shippingPartner.partner_name,
          partner_code: shippingPartner.partner_code,
          status: shippingPartner.status,
          description: shippingPartner.description,
          created_at: toISOStringSafe(shippingPartner.created_at),
          updated_at: toISOStringSafe(shippingPartner.updated_at),
          deleted_at:
            shippingPartner.deleted_at !== null &&
            shippingPartner.deleted_at !== undefined
              ? toISOStringSafe(shippingPartner.deleted_at)
              : undefined,
        }
      : undefined,
    reason: updated.reason,
    status: updated.status,
    pickup_address: updated.pickup_address ?? undefined,
    scheduled_pickup_at: updated.scheduled_pickup_at
      ? toISOStringSafe(updated.scheduled_pickup_at)
      : undefined,
    provider_tracking_code: updated.provider_tracking_code ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
    cancelled_at: updated.cancelled_at
      ? toISOStringSafe(updated.cancelled_at)
      : undefined,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
