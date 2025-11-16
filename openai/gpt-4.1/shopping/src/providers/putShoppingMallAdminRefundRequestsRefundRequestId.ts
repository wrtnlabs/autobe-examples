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

export async function putShoppingMallAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const refund = await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
    where: {
      id: props.refundRequestId,
      deleted_at: null,
    },
  });
  if (!refund) {
    throw new HttpException("Refund request not found", 404);
  }

  let adminRecord: null | { id: string; name: string; email: string } = null;
  if (
    Object.prototype.hasOwnProperty.call(props.body, "shopping_mall_admin_id")
  ) {
    if (props.body.shopping_mall_admin_id === null) {
      adminRecord = null;
    } else {
      const foundAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
        where: {
          id: props.body.shopping_mall_admin_id ?? undefined,
          status: "active",
          is_email_verified: true,
        },
      });
      if (!foundAdmin) {
        throw new HttpException("Assigned admin not found or not active", 400);
      }
      adminRecord = {
        id: foundAdmin.id,
        name: foundAdmin.name,
        email: foundAdmin.email,
      };
    }
  }

  const dataToUpdate: Record<string, any> = {
    ...("status" in props.body ? { status: props.body.status } : {}),
    ...("approved_amount" in props.body
      ? { approved_amount: props.body.approved_amount }
      : {}),
    ...("shopping_mall_admin_id" in props.body
      ? {
          shopping_mall_admin_id:
            props.body.shopping_mall_admin_id === undefined
              ? refund.shopping_mall_admin_id
              : props.body.shopping_mall_admin_id,
        }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };
  const updated = await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: dataToUpdate,
  });

  const [order, customer, seller, adminSummary] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findFirst({
      where: { id: updated.shopping_mall_order_id, deleted_at: null },
    }),
    MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: { id: updated.shopping_mall_customer_id },
    }),
    MyGlobal.prisma.shopping_mall_sellers.findFirst({
      where: { id: updated.shopping_mall_seller_id },
    }),
    updated.shopping_mall_admin_id
      ? MyGlobal.prisma.shopping_mall_admins.findFirst({
          where: { id: updated.shopping_mall_admin_id },
        })
      : undefined,
  ]);

  return {
    id: updated.id,
    order: order
      ? {
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
        }
      : undefined!,
    customer: customer ? { id: customer.id, name: customer.name } : undefined!,
    seller: seller
      ? { id: seller.id, business_name: seller.business_name }
      : undefined!,
    admin:
      adminSummary && adminSummary.id
        ? {
            id: adminSummary.id,
            name: adminSummary.name,
            email: adminSummary.email,
          }
        : undefined,
    status: updated.status,
    reason: updated.reason,
    requested_amount: updated.requested_amount,
    approved_amount:
      "approved_amount" in updated
        ? updated.approved_amount === null
          ? null
          : updated.approved_amount
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      "deleted_at" in updated && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : updated.deleted_at === null
          ? null
          : undefined,
  };
}
