import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerReturnRequestsReturnRequestId(props: {
  seller: SellerPayload;
  returnRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallReturnRequest.IUpdate;
}): Promise<IShoppingMallReturnRequest> {
  // 1. Find the return request (not soft deleted)
  const returnRequest =
    await MyGlobal.prisma.shopping_mall_return_requests.findFirst({
      where: {
        id: props.returnRequestId,
        deleted_at: null,
      },
    });
  if (!returnRequest) {
    throw new HttpException("Return request not found.", 404);
  }

  // 2. Validate seller owns this request (requested_by_seller, or is seller on related order)
  if (returnRequest.requested_by_seller_id !== props.seller.id) {
    // Check if order belongs to seller
    const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
      where: { id: returnRequest.order_id },
    });
    if (!order || order.shopping_mall_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden: Not your return request.", 403);
    }
  }

  // 3. Prepare update data - strictly allow only mutable fields
  const {
    reason,
    status,
    pickup_address,
    scheduled_pickup_at,
    provider_tracking_code,
    shipping_partner_id,
  } = props.body ?? {};

  const validStatuses = [
    "pending",
    "approved",
    "scheduled",
    "picked_up",
    "delivered",
    "completed",
    "rejected",
    "cancelled",
  ];
  if (status && !validStatuses.includes(status)) {
    throw new HttpException("Invalid status value.", 409);
  }
  if (
    ["completed", "cancelled"].includes(returnRequest.status) &&
    status &&
    status !== returnRequest.status
  ) {
    throw new HttpException(
      "Cannot transition from completed or cancelled.",
      409,
    );
  }

  const updateData: Record<string, unknown> = {
    ...(reason !== undefined && { reason }),
    ...(status !== undefined && { status }),
    ...(pickup_address !== undefined && { pickup_address }),
    ...(scheduled_pickup_at !== undefined && { scheduled_pickup_at }),
    ...(provider_tracking_code !== undefined && { provider_tracking_code }),
    ...(shipping_partner_id !== undefined && { shipping_partner_id }),
    updated_at: toISOStringSafe(new Date()),
  };
  if (status === "completed") {
    updateData.completed_at = toISOStringSafe(new Date());
  } else if (status === "cancelled") {
    updateData.cancelled_at = toISOStringSafe(new Date());
  }

  const updated = await MyGlobal.prisma.shopping_mall_return_requests.update({
    where: { id: props.returnRequestId },
    data: updateData,
  });

  // Get order, orderItem, and sku (required for summaries)
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: updated.order_id },
  });
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: updated.order_item_id },
  });
  let sku: null | any = null;
  if (orderItem) {
    sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
      where: { id: orderItem.shopping_mall_product_sku_id },
    });
  }

  // Compose requestedByCustomer
  let requestedByCustomer = undefined;
  if (updated.requested_by_customer_id) {
    const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: updated.requested_by_customer_id },
    });
    if (customer) {
      requestedByCustomer = {
        id: customer.id,
        name: customer.name,
      };
    }
  }
  // Compose requestedBySeller
  let requestedBySeller = undefined;
  if (updated.requested_by_seller_id) {
    const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: updated.requested_by_seller_id },
    });
    if (seller) {
      requestedBySeller = {
        id: seller.id,
        business_name: seller.business_name,
      };
    }
  }
  // Compose shippingPartner
  let shippingPartner = undefined;
  if (updated.shipping_partner_id) {
    const shippingPartnerObj =
      await MyGlobal.prisma.shopping_mall_shipping_partners.findUnique({
        where: { id: updated.shipping_partner_id },
      });
    if (shippingPartnerObj) {
      shippingPartner = {
        id: shippingPartnerObj.id,
        partner_name: shippingPartnerObj.partner_name,
        partner_code: shippingPartnerObj.partner_code,
        status: shippingPartnerObj.status,
        description: shippingPartnerObj.description,
        created_at: toISOStringSafe(shippingPartnerObj.created_at),
        updated_at: toISOStringSafe(shippingPartnerObj.updated_at),
        deleted_at: shippingPartnerObj.deleted_at
          ? toISOStringSafe(shippingPartnerObj.deleted_at)
          : undefined,
      };
    }
  }
  // Compose order summary
  const orderSummary = order && {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at
      ? toISOStringSafe(order.deleted_at)
      : undefined,
  };

  // Compose orderItem summary only if we have both orderItem and sku
  let orderItemSummary = undefined;
  if (orderItem && sku) {
    // For code, use sku.sku_code; for the rest, provide minimal mock or blank values
    const skuSummary = {
      id: sku.id,
      code: sku.sku_code, // sku_code
      product_title: "", // unavailable, set as blank string
      option_summary: "", // unavailable, set as blank string
      in_stock: false, // unavailable, set as default false
    };
    orderItemSummary = {
      id: orderItem.id,
      shopping_mall_order_id: orderItem.shopping_mall_order_id,
      sku: skuSummary,
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
      subtotal: orderItem.subtotal,
      currency: orderItem.currency,
      delivered: orderItem.delivered,
      refunded: orderItem.refunded,
      created_at: toISOStringSafe(orderItem.created_at),
      updated_at: toISOStringSafe(orderItem.updated_at),
    };
  }

  return {
    id: updated.id,
    order: orderSummary!,
    orderItem: orderItemSummary!,
    requestedByCustomer: requestedByCustomer ?? undefined,
    requestedBySeller: requestedBySeller ?? undefined,
    shippingPartner: shippingPartner ?? undefined,
    reason: updated.reason,
    status: updated.status,
    pickup_address:
      typeof updated.pickup_address !== "undefined"
        ? updated.pickup_address
        : undefined,
    scheduled_pickup_at:
      typeof updated.scheduled_pickup_at !== "undefined" &&
      updated.scheduled_pickup_at !== null
        ? toISOStringSafe(updated.scheduled_pickup_at)
        : updated.scheduled_pickup_at,
    provider_tracking_code:
      typeof updated.provider_tracking_code !== "undefined"
        ? updated.provider_tracking_code
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at:
      typeof updated.completed_at !== "undefined" &&
      updated.completed_at !== null
        ? toISOStringSafe(updated.completed_at)
        : updated.completed_at,
    cancelled_at:
      typeof updated.cancelled_at !== "undefined" &&
      updated.cancelled_at !== null
        ? toISOStringSafe(updated.cancelled_at)
        : updated.cancelled_at,
    deleted_at:
      typeof updated.deleted_at !== "undefined" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : updated.deleted_at,
  };
}
