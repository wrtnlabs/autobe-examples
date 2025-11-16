import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { IPageIShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCancellations(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderCancellation.IRequest;
}): Promise<IPageIShoppingMallOrderCancellation.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereConditions: Record<string, unknown> = {
    deleted_at: null,
  };

  if (props.body.status) {
    whereConditions.approval_status = props.body.status;
  }

  if (props.body.order_id) {
    whereConditions.shopping_mall_order_id = props.body.order_id;
  }

  if (props.body.buyer_id) {
    whereConditions.requested_by_buyer_id = props.body.buyer_id;
  }

  if (props.body.from_date || props.body.to_date) {
    whereConditions.requested_at = {};
    if (props.body.from_date) {
      (whereConditions.requested_at as Record<string, unknown>).gte = new Date(
        props.body.from_date,
      );
    }
    if (props.body.to_date) {
      (whereConditions.requested_at as Record<string, unknown>).lte = new Date(
        props.body.to_date,
      );
    }
  }

  if (props.body.approval_status) {
    whereConditions.approval_status = props.body.approval_status;
  }

  if (props.body.search) {
    whereConditions.OR = [
      { cancellation_reason: { contains: props.body.search } },
      { cancellation_explanation: { contains: props.body.search } },
    ];
  }

  const orderByField = props.body.sort_by ?? "created_at";
  const orderByDirection = props.body.order ?? "desc";

  const [cancellations, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_cancellations.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderByDirection },
      include: {
        order: true,
        orderSeller: {
          include: {
            seller: true,
          },
        },
        requestedByBuyer: true,
        requestedBySeller: true,
        requestedByAdmin: true,
        approvedBySeller: true,
        approvedByAdmin: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_cancellations.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: cancellations.map((cancellation) => ({
      id: cancellation.id,
      shopping_mall_order_id: cancellation.shopping_mall_order_id,
      shopping_mall_order_seller_id:
        cancellation.shopping_mall_order_seller_id ?? undefined,
      requested_by_buyer_id: cancellation.requested_by_buyer_id ?? undefined,
      requested_by_seller_id: cancellation.requested_by_seller_id ?? undefined,
      requested_by_admin_id: cancellation.requested_by_admin_id ?? undefined,
      approved_by_seller_id: cancellation.approved_by_seller_id ?? undefined,
      approved_by_admin_id: cancellation.approved_by_admin_id ?? undefined,
      cancellation_reason: cancellation.cancellation_reason,
      cancellation_explanation:
        cancellation.cancellation_explanation ?? undefined,
      approval_status: cancellation.approval_status,
      refund_amount: cancellation.refund_amount ?? undefined,
      requested_at: toISOStringSafe(cancellation.requested_at),
      approved_at: cancellation.approved_at
        ? toISOStringSafe(cancellation.approved_at)
        : undefined,
      denied_at: cancellation.denied_at
        ? toISOStringSafe(cancellation.denied_at)
        : undefined,
      completed_at: cancellation.completed_at
        ? toISOStringSafe(cancellation.completed_at)
        : undefined,
      created_at: toISOStringSafe(cancellation.created_at),
      updated_at: toISOStringSafe(cancellation.updated_at),
      deleted_at: cancellation.deleted_at
        ? toISOStringSafe(cancellation.deleted_at)
        : undefined,
      order: {
        id: cancellation.order.id,
        order_number: cancellation.order.order_number,
        status: cancellation.order.status,
        subtotal: cancellation.order.subtotal,
        shipping_total: cancellation.order.shipping_total,
        tax_total: cancellation.order.tax_total,
        discount_total: cancellation.order.discount_total,
        total_amount: cancellation.order.total_amount,
        estimated_delivery_start: cancellation.order.estimated_delivery_start
          ? toISOStringSafe(cancellation.order.estimated_delivery_start)
          : undefined,
        estimated_delivery_end: cancellation.order.estimated_delivery_end
          ? toISOStringSafe(cancellation.order.estimated_delivery_end)
          : undefined,
        actual_delivery_at: cancellation.order.actual_delivery_at
          ? toISOStringSafe(cancellation.order.actual_delivery_at)
          : undefined,
        cancelled_at: cancellation.order.cancelled_at
          ? toISOStringSafe(cancellation.order.cancelled_at)
          : undefined,
        completed_at: cancellation.order.completed_at
          ? toISOStringSafe(cancellation.order.completed_at)
          : undefined,
        created_at: toISOStringSafe(cancellation.order.created_at),
        updated_at: toISOStringSafe(cancellation.order.updated_at),
      },
      orderSeller: cancellation.orderSeller
        ? {
            id: cancellation.orderSeller.id,
            sub_order_number: cancellation.orderSeller.sub_order_number,
            status: typia.assert<
              | "pending"
              | "confirmed"
              | "processing"
              | "shipped"
              | "delivered"
              | "cancelled"
            >(cancellation.orderSeller.status),
            seller: {
              id: cancellation.orderSeller.seller.id,
              store_name: cancellation.orderSeller.seller.store_name,
              email: cancellation.orderSeller.seller.email,
              status: typia.assert<
                "pending" | "approved" | "rejected" | "suspended"
              >(cancellation.orderSeller.seller.status),
              email_verified: cancellation.orderSeller.seller.email_verified,
            },
            subtotal: cancellation.orderSeller.subtotal,
            shipping_cost: cancellation.orderSeller.shipping_cost,
            shipping_method: cancellation.orderSeller.shipping_method,
            tracking_number:
              cancellation.orderSeller.tracking_number ?? undefined,
            carrier_name: cancellation.orderSeller.carrier_name ?? undefined,
            shipped_at: cancellation.orderSeller.shipped_at
              ? toISOStringSafe(cancellation.orderSeller.shipped_at)
              : undefined,
            delivered_at: cancellation.orderSeller.delivered_at
              ? toISOStringSafe(cancellation.orderSeller.delivered_at)
              : undefined,
            created_at: toISOStringSafe(cancellation.orderSeller.created_at),
            updated_at: toISOStringSafe(cancellation.orderSeller.updated_at),
            deleted_at: cancellation.orderSeller.deleted_at
              ? toISOStringSafe(cancellation.orderSeller.deleted_at)
              : undefined,
          }
        : undefined,
      requestedByBuyer: cancellation.requestedByBuyer
        ? {
            id: cancellation.requestedByBuyer.id,
            email: cancellation.requestedByBuyer.email,
            full_name: cancellation.requestedByBuyer.full_name,
            phone_number:
              cancellation.requestedByBuyer.phone_number ?? undefined,
          }
        : undefined,
      requestedBySeller: cancellation.requestedBySeller
        ? {
            id: cancellation.requestedBySeller.id,
            store_name: cancellation.requestedBySeller.store_name,
            email: cancellation.requestedBySeller.email,
            status: typia.assert<
              "pending" | "approved" | "rejected" | "suspended"
            >(cancellation.requestedBySeller.status),
            email_verified: cancellation.requestedBySeller.email_verified,
          }
        : undefined,
      requestedByAdmin: cancellation.requestedByAdmin
        ? {
            id: cancellation.requestedByAdmin.id,
            email: cancellation.requestedByAdmin.email,
            full_name: cancellation.requestedByAdmin.full_name,
            phone_number: cancellation.requestedByAdmin.phone_number,
            admin_level: typia.assert<"super_admin" | "moderator" | "support">(
              cancellation.requestedByAdmin.admin_level,
            ),
            email_verified: cancellation.requestedByAdmin.email_verified,
            created_at: toISOStringSafe(
              cancellation.requestedByAdmin.created_at,
            ),
            updated_at: toISOStringSafe(
              cancellation.requestedByAdmin.updated_at,
            ),
            deleted_at: cancellation.requestedByAdmin.deleted_at
              ? toISOStringSafe(cancellation.requestedByAdmin.deleted_at)
              : null,
          }
        : undefined,
      approvedBySeller: cancellation.approvedBySeller
        ? {
            id: cancellation.approvedBySeller.id,
            store_name: cancellation.approvedBySeller.store_name,
            email: cancellation.approvedBySeller.email,
            status: typia.assert<
              "pending" | "approved" | "rejected" | "suspended"
            >(cancellation.approvedBySeller.status),
            email_verified: cancellation.approvedBySeller.email_verified,
          }
        : undefined,
      approvedByAdmin: cancellation.approvedByAdmin
        ? {
            id: cancellation.approvedByAdmin.id,
            email: cancellation.approvedByAdmin.email,
            full_name: cancellation.approvedByAdmin.full_name,
            phone_number: cancellation.approvedByAdmin.phone_number,
            admin_level: typia.assert<"super_admin" | "moderator" | "support">(
              cancellation.approvedByAdmin.admin_level,
            ),
            email_verified: cancellation.approvedByAdmin.email_verified,
            created_at: toISOStringSafe(
              cancellation.approvedByAdmin.created_at,
            ),
            updated_at: toISOStringSafe(
              cancellation.approvedByAdmin.updated_at,
            ),
            deleted_at: cancellation.approvedByAdmin.deleted_at
              ? toISOStringSafe(cancellation.approvedByAdmin.deleted_at)
              : null,
          }
        : undefined,
    })),
  };
}
