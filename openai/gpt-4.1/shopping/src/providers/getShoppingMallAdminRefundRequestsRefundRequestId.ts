import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function getShoppingMallAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const refund = await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
    where: {
      id: props.refundRequestId,
      deleted_at: null,
    },
    include: {
      order: true,
      customer: true,
      seller: true,
      admin: true,
    },
  });

  if (!refund) {
    throw new HttpException("Refund request not found", 404);
  }

  return {
    id: refund.id,
    order: {
      id: refund.order.id,
      order_number: refund.order.order_number,
      status: refund.order.status,
      total_amount: refund.order.total_amount,
      currency: refund.order.currency,
      created_at: toISOStringSafe(refund.order.created_at),
      updated_at: toISOStringSafe(refund.order.updated_at),
      deleted_at: refund.order.deleted_at
        ? toISOStringSafe(refund.order.deleted_at)
        : undefined,
    },
    customer: {
      id: refund.customer.id,
      name: refund.customer.name,
    },
    seller: {
      id: refund.seller.id,
      business_name: refund.seller.business_name,
    },
    admin: refund.admin
      ? {
          id: refund.admin.id,
          name: refund.admin.name,
          email: refund.admin.email,
        }
      : undefined,
    status: refund.status,
    reason: refund.reason,
    requested_amount: refund.requested_amount,
    approved_amount:
      typeof refund.approved_amount === "number"
        ? refund.approved_amount
        : null,
    created_at: toISOStringSafe(refund.created_at),
    updated_at: toISOStringSafe(refund.updated_at),
    deleted_at: refund.deleted_at
      ? toISOStringSafe(refund.deleted_at)
      : undefined,
  };
}
