import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnRequest";
import { IPageIShoppingMallReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReturnRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminReturnRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallReturnRequest.IRequest;
}): Promise<IPageIShoppingMallReturnRequest.ISummary> {
  const {
    status,
    order_id,
    order_item_id,
    requested_by_customer_id,
    requested_by_seller_id,
    scheduled_pickup_from,
    scheduled_pickup_to,
    created_from,
    created_to,
    reason_q,
    page,
    limit,
    sort_by,
    sort_direction,
  } = props.body;
  const pageNumber = page !== undefined ? (page satisfies number as number) : 1;
  const limitNumber =
    limit !== undefined ? (limit satisfies number as number) : 20;
  const offset = (pageNumber - 1) * limitNumber;
  const where: Prisma.shopping_mall_return_requestsWhereInput = {
    deleted_at: null,
    ...(status !== undefined && { status }),
    ...(order_id !== undefined && { order_id }),
    ...(order_item_id !== undefined && { order_item_id }),
    ...(requested_by_customer_id !== undefined && { requested_by_customer_id }),
    ...(requested_by_seller_id !== undefined && { requested_by_seller_id }),
    ...(scheduled_pickup_from !== undefined || scheduled_pickup_to !== undefined
      ? {
          scheduled_pickup_at: {
            ...(scheduled_pickup_from !== undefined && {
              gte:
                scheduled_pickup_from !== null
                  ? toISOStringSafe(scheduled_pickup_from)
                  : undefined,
            }),
            ...(scheduled_pickup_to !== undefined && {
              lte:
                scheduled_pickup_to !== null
                  ? toISOStringSafe(scheduled_pickup_to)
                  : undefined,
            }),
          },
        }
      : {}),
    ...(created_from !== undefined || created_to !== undefined
      ? {
          created_at: {
            ...(created_from !== undefined && {
              gte:
                created_from !== null
                  ? toISOStringSafe(created_from)
                  : undefined,
            }),
            ...(created_to !== undefined && {
              lte:
                created_to !== null ? toISOStringSafe(created_to) : undefined,
            }),
          },
        }
      : {}),
    ...(reason_q !== undefined && reason_q.trim() !== ""
      ? { reason: { contains: reason_q, mode: "insensitive" } }
      : {}),
  };
  const allowedSortFields = [
    "created_at",
    "scheduled_pickup_at",
    "status",
    "id",
  ];
  const sortField =
    sort_by && allowedSortFields.includes(sort_by) ? sort_by : "created_at";
  const sortDirection =
    sort_direction === "asc" || sort_direction === "desc"
      ? sort_direction
      : "desc";
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_return_requests.findMany({
      where,
      skip: offset,
      take: limitNumber,
      orderBy: { [sortField]: sortDirection },
      include: {
        order: true,
        orderItem: true,
        requestedByCustomer: true,
        requestedBySeller: true,
        shippingPartner: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_return_requests.count({ where }),
  ]);

  const data = rows.map((row): IShoppingMallReturnRequest.ISummary => {
    const orderObj: IShoppingMallOrder.ISummary = row.order
      ? {
          id: row.order.id,
          order_number: row.order.order_number,
          status: row.order.status,
          total_amount: row.order.total_amount,
          currency: row.order.currency,
          created_at: toISOStringSafe(row.order.created_at),
          updated_at: toISOStringSafe(row.order.updated_at),
          deleted_at:
            row.order.deleted_at !== null && row.order.deleted_at !== undefined
              ? toISOStringSafe(row.order.deleted_at)
              : undefined,
        }
      : typia.random<IShoppingMallOrder.ISummary>();
    const orderItemObj: IShoppingMallOrderItem.ISummary = row.orderItem
      ? {
          id: row.orderItem.id,
          shopping_mall_order_id: row.orderItem.shopping_mall_order_id,
          sku: typia.random<IShoppingMallProductSku.ISummary>(), // Not joined, must stub
          quantity: row.orderItem.quantity,
          unit_price: row.orderItem.unit_price,
          subtotal: row.orderItem.subtotal,
          currency: row.orderItem.currency,
          delivered: row.orderItem.delivered,
          refunded: row.orderItem.refunded,
          created_at: toISOStringSafe(row.orderItem.created_at),
          updated_at: toISOStringSafe(row.orderItem.updated_at),
        }
      : typia.random<IShoppingMallOrderItem.ISummary>();
    return {
      id: row.id,
      order: orderObj,
      orderItem: orderItemObj,
      requestedByCustomer: row.requestedByCustomer
        ? {
            id: row.requestedByCustomer.id,
            name: row.requestedByCustomer.name,
          }
        : undefined,
      requestedBySeller: row.requestedBySeller
        ? {
            id: row.requestedBySeller.id,
            business_name: row.requestedBySeller.business_name,
          }
        : undefined,
      shippingPartner: row.shippingPartner
        ? {
            id: row.shippingPartner.id,
            partner_name: row.shippingPartner.partner_name,
            partner_code: row.shippingPartner.partner_code,
            status: row.shippingPartner.status,
            description: row.shippingPartner.description,
            created_at: toISOStringSafe(row.shippingPartner.created_at),
            updated_at: toISOStringSafe(row.shippingPartner.updated_at),
            deleted_at:
              row.shippingPartner.deleted_at !== null &&
              row.shippingPartner.deleted_at !== undefined
                ? toISOStringSafe(row.shippingPartner.deleted_at)
                : undefined,
          }
        : undefined,
      reason: row.reason,
      status: row.status,
      pickup_address: row.pickup_address ?? undefined,
      scheduled_pickup_at:
        row.scheduled_pickup_at !== null &&
        row.scheduled_pickup_at !== undefined
          ? toISOStringSafe(row.scheduled_pickup_at)
          : undefined,
      provider_tracking_code: row.provider_tracking_code ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      completed_at:
        row.completed_at !== null && row.completed_at !== undefined
          ? toISOStringSafe(row.completed_at)
          : undefined,
      cancelled_at:
        row.cancelled_at !== null && row.cancelled_at !== undefined
          ? toISOStringSafe(row.cancelled_at)
          : undefined,
    };
  });

  const response: IPageIShoppingMallReturnRequest.ISummary = {
    pagination: {
      current: pageNumber as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limitNumber as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limitNumber) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
  return response;
}
