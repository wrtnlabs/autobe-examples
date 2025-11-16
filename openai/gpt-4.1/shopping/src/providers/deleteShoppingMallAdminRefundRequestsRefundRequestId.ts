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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  // 1. Find the refund request and ensure it is not soft-deleted
  const refund = await MyGlobal.prisma.shopping_mall_refund_requests.findUnique(
    {
      where: { id: props.refundRequestId },
      include: {
        order: true,
        customer: true,
        seller: true,
        admin: true,
      },
    },
  );

  if (!refund || refund.deleted_at !== null) {
    throw new HttpException(
      "Refund request not found or already deleted.",
      404,
    );
  }

  // 2. Set deleted_at with ISO timestamp and update
  const deletedAt = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: { deleted_at: deletedAt },
  });

  // Fetch the related foreign keys from the correct fields
  const orderId = updated.shopping_mall_order_id;
  const customerId = updated.shopping_mall_customer_id;
  const sellerId = updated.shopping_mall_seller_id;
  const adminId = updated.shopping_mall_admin_id;

  // 3. Fetch relations for output (to ensure correct API structure)
  const [order, customer, seller, admin] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        order_number: true,
        status: true,
        total_amount: true,
        currency: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        business_name: true,
      },
    }),
    adminId
      ? MyGlobal.prisma.shopping_mall_admins.findUnique({
          where: { id: adminId },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : Promise.resolve(undefined),
  ]);

  // throw 404 if critical relations are missing (order, customer, seller)
  if (!order || !customer || !seller) {
    throw new HttpException("Related entity not found.", 404);
  }

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
      deleted_at: order.deleted_at
        ? toISOStringSafe(order.deleted_at)
        : undefined,
    },
    customer: {
      id: customer.id,
      name: customer.name,
    },
    seller: {
      id: seller.id,
      business_name: seller.business_name,
    },
    admin: admin
      ? {
          id: admin.id,
          name: admin.name,
          email: admin.email,
        }
      : undefined,
    status: updated.status,
    reason: updated.reason,
    requested_amount: updated.requested_amount,
    approved_amount:
      typeof updated.approved_amount === "number"
        ? updated.approved_amount
        : updated.approved_amount === null
          ? null
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: deletedAt,
  };
}
