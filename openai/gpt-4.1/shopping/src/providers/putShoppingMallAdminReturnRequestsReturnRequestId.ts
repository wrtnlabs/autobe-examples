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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminReturnRequestsReturnRequestId(props: {
  admin: AdminPayload;
  returnRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallReturnRequest.IUpdate;
}): Promise<IShoppingMallReturnRequest> {
  // Fetch existing return request
  const existing =
    await MyGlobal.prisma.shopping_mall_return_requests.findUnique({
      where: { id: props.returnRequestId },
      include: {
        order: true,
        orderItem: true,
        requestedByCustomer: true,
        requestedBySeller: true,
        shippingPartner: true,
      },
    });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Return request not found", 404);
  }

  // Define valid status transitions (simple example)
  const validTransitions: Record<string, string[]> = {
    pending: ["approved", "rejected", "cancelled"],
    approved: ["scheduled", "cancelled"],
    scheduled: ["picked_up", "cancelled"],
    picked_up: ["delivered", "cancelled"],
    delivered: ["completed", "cancelled"],
    completed: [],
    rejected: [],
    cancelled: [],
  };
  const currentStatus = existing.status;
  const newStatus = props.body.status ?? currentStatus;
  if (newStatus !== currentStatus) {
    if (
      !validTransitions[currentStatus] ||
      !validTransitions[currentStatus].includes(newStatus)
    ) {
      throw new HttpException(
        `Invalid status transition: ${currentStatus} → ${newStatus}`,
        400,
      );
    }
  }
  // Compose update data (patch only mutable fields)
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (typeof props.body.reason === "string")
    updateData.reason = props.body.reason;
  if (typeof props.body.status === "string")
    updateData.status = props.body.status;
  if (Object.prototype.hasOwnProperty.call(props.body, "pickup_address"))
    updateData.pickup_address =
      props.body.pickup_address === undefined
        ? null
        : props.body.pickup_address;
  if (Object.prototype.hasOwnProperty.call(props.body, "scheduled_pickup_at"))
    updateData.scheduled_pickup_at =
      props.body.scheduled_pickup_at === undefined
        ? null
        : props.body.scheduled_pickup_at;
  if (
    Object.prototype.hasOwnProperty.call(props.body, "provider_tracking_code")
  )
    updateData.provider_tracking_code =
      props.body.provider_tracking_code === undefined
        ? null
        : props.body.provider_tracking_code;
  if (Object.prototype.hasOwnProperty.call(props.body, "shipping_partner_id"))
    updateData.shipping_partner_id =
      props.body.shipping_partner_id === undefined
        ? null
        : props.body.shipping_partner_id;

  // If shipping_partner_id is being updated, validate existence of partner
  if (
    Object.prototype.hasOwnProperty.call(props.body, "shipping_partner_id") &&
    props.body.shipping_partner_id
  ) {
    const partner =
      await MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
        where: { id: props.body.shipping_partner_id },
        select: { id: true },
      });
    if (!partner) {
      throw new HttpException("Shipping partner not found", 404);
    }
  }

  // If nothing to update, error
  if (Object.keys(updateData).length === 1) {
    throw new HttpException("No updatable field provided", 400);
  }

  const updated = await MyGlobal.prisma.shopping_mall_return_requests.update({
    where: { id: props.returnRequestId },
    data: updateData,
    include: {
      order: true,
      orderItem: true,
      requestedByCustomer: true,
      requestedBySeller: true,
      shippingPartner: true,
    },
  });

  // Fetch SKU details for orderItem.sku summary (use only valid fields)
  let skuSummary: IShoppingMallProductSku.ISummary | undefined = undefined;
  if (updated.orderItem && updated.orderItem.shopping_mall_product_sku_id) {
    const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
      where: { id: updated.orderItem.shopping_mall_product_sku_id },
      select: {
        id: true,
        sku_code: true,
        // product_title: true, // not available
        // option_summary: true, // not available
        // in_stock: true, // not available
      },
    });
    if (sku) {
      skuSummary = {
        id: sku.id,
        code: sku.sku_code,
        product_title: "",
        option_summary: "",
        in_stock: false,
      };
    }
  }

  return {
    id: updated.id,
    order: {
      id: updated.order.id,
      order_number: updated.order.order_number,
      status: updated.order.status,
      total_amount: updated.order.total_amount,
      currency: updated.order.currency,
      created_at: toISOStringSafe(updated.order.created_at),
      updated_at: toISOStringSafe(updated.order.updated_at),
      deleted_at: updated.order.deleted_at
        ? toISOStringSafe(updated.order.deleted_at)
        : undefined,
    },
    orderItem: {
      id: updated.orderItem.id,
      shopping_mall_order_id: updated.orderItem.shopping_mall_order_id,
      sku: skuSummary!,
      quantity: updated.orderItem.quantity,
      unit_price: updated.orderItem.unit_price,
      subtotal: updated.orderItem.subtotal,
      currency: updated.orderItem.currency,
      delivered: updated.orderItem.delivered,
      refunded: updated.orderItem.refunded,
      created_at: toISOStringSafe(updated.orderItem.created_at),
      updated_at: toISOStringSafe(updated.orderItem.updated_at),
    },
    requestedByCustomer: updated.requestedByCustomer
      ? {
          id: updated.requestedByCustomer.id,
          name: updated.requestedByCustomer.name,
        }
      : undefined,
    requestedBySeller: updated.requestedBySeller
      ? {
          id: updated.requestedBySeller.id,
          business_name: updated.requestedBySeller.business_name,
        }
      : undefined,
    shippingPartner: updated.shippingPartner
      ? {
          id: updated.shippingPartner.id,
          partner_name: updated.shippingPartner.partner_name,
          partner_code: updated.shippingPartner.partner_code,
          status: updated.shippingPartner.status,
          description: updated.shippingPartner.description,
          created_at: toISOStringSafe(updated.shippingPartner.created_at),
          updated_at: toISOStringSafe(updated.shippingPartner.updated_at),
          deleted_at: updated.shippingPartner.deleted_at
            ? toISOStringSafe(updated.shippingPartner.deleted_at)
            : undefined,
        }
      : undefined,
    reason: updated.reason,
    status: updated.status,
    pickup_address: Object.prototype.hasOwnProperty.call(
      updated,
      "pickup_address",
    )
      ? (updated.pickup_address ?? null)
      : undefined,
    scheduled_pickup_at: Object.prototype.hasOwnProperty.call(
      updated,
      "scheduled_pickup_at",
    )
      ? updated.scheduled_pickup_at
        ? toISOStringSafe(updated.scheduled_pickup_at)
        : null
      : undefined,
    provider_tracking_code: Object.prototype.hasOwnProperty.call(
      updated,
      "provider_tracking_code",
    )
      ? (updated.provider_tracking_code ?? null)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at: Object.prototype.hasOwnProperty.call(updated, "completed_at")
      ? updated.completed_at
        ? toISOStringSafe(updated.completed_at)
        : null
      : undefined,
    cancelled_at: Object.prototype.hasOwnProperty.call(updated, "cancelled_at")
      ? updated.cancelled_at
        ? toISOStringSafe(updated.cancelled_at)
        : null
      : undefined,
    deleted_at: Object.prototype.hasOwnProperty.call(updated, "deleted_at")
      ? updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null
      : undefined,
  };
}
