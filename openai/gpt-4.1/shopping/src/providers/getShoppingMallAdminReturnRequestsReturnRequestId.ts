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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminReturnRequestsReturnRequestId(props: {
  admin: AdminPayload;
  returnRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReturnRequest> {
  const record = await MyGlobal.prisma.shopping_mall_return_requests.findFirst({
    where: {
      id: props.returnRequestId,
      deleted_at: null,
    },
    include: {
      order: true,
      orderItem: {
        include: {
          sku: true,
        },
      },
      requestedByCustomer: true,
      requestedBySeller: true,
      shippingPartner: true,
    },
  });
  if (!record) {
    throw new HttpException("Return request not found", 404);
  }
  return {
    id: record.id,
    order: {
      id: record.order.id,
      order_number: record.order.order_number,
      status: record.order.status,
      total_amount: record.order.total_amount,
      currency: record.order.currency,
      created_at: toISOStringSafe(record.order.created_at),
      updated_at: toISOStringSafe(record.order.updated_at),
      deleted_at: record.order.deleted_at
        ? toISOStringSafe(record.order.deleted_at)
        : undefined,
    },
    orderItem: {
      id: record.orderItem.id,
      shopping_mall_order_id: record.orderItem.shopping_mall_order_id,
      sku: {
        id: record.orderItem.sku.id,
        code: record.orderItem.sku.sku_code,
        product_title: "", // No product title available from sku table
        option_summary: "", // No option summary available from sku table
        in_stock:
          typeof record.orderItem.sku.stock === "number"
            ? record.orderItem.sku.stock > 0
            : false,
      },
      quantity: record.orderItem.quantity,
      unit_price: record.orderItem.unit_price,
      subtotal: record.orderItem.subtotal,
      currency: record.orderItem.currency,
      delivered: record.orderItem.delivered,
      refunded: record.orderItem.refunded,
      created_at: toISOStringSafe(record.orderItem.created_at),
      updated_at: toISOStringSafe(record.orderItem.updated_at),
    },
    requestedByCustomer: record.requestedByCustomer
      ? {
          id: record.requestedByCustomer.id,
          name: record.requestedByCustomer.name,
        }
      : undefined,
    requestedBySeller: record.requestedBySeller
      ? {
          id: record.requestedBySeller.id,
          business_name: record.requestedBySeller.business_name,
        }
      : undefined,
    shippingPartner: record.shippingPartner
      ? {
          id: record.shippingPartner.id,
          partner_name: record.shippingPartner.partner_name,
          partner_code: record.shippingPartner.partner_code,
          status: record.shippingPartner.status,
          description: record.shippingPartner.description,
          created_at: toISOStringSafe(record.shippingPartner.created_at),
          updated_at: toISOStringSafe(record.shippingPartner.updated_at),
          deleted_at:
            record.shippingPartner.deleted_at !== null
              ? toISOStringSafe(record.shippingPartner.deleted_at)
              : undefined,
        }
      : undefined,
    reason: record.reason,
    status: record.status,
    pickup_address: record.pickup_address ?? undefined,
    scheduled_pickup_at:
      record.scheduled_pickup_at !== null &&
      record.scheduled_pickup_at !== undefined
        ? toISOStringSafe(record.scheduled_pickup_at)
        : undefined,
    provider_tracking_code: record.provider_tracking_code ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    completed_at:
      record.completed_at !== null && record.completed_at !== undefined
        ? toISOStringSafe(record.completed_at)
        : undefined,
    cancelled_at:
      record.cancelled_at !== null && record.cancelled_at !== undefined
        ? toISOStringSafe(record.cancelled_at)
        : undefined,
    deleted_at:
      record.deleted_at !== null && record.deleted_at !== undefined
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
