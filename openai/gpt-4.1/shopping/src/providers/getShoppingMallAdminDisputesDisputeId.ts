import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminDisputesDisputeId(props: {
  admin: AdminPayload;
  disputeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDispute> {
  const dispute = await MyGlobal.prisma.shopping_mall_disputes.findUnique({
    where: { id: props.disputeId },
    include: {
      refundRequest: {
        include: {
          order: true,
          customer: true,
          seller: true,
        },
      },
      customer: true,
      seller: true,
      admin: true,
    },
  });

  if (!dispute) {
    throw new HttpException("Dispute not found", 404);
  }

  return {
    id: dispute.id,
    refund_request: dispute.refundRequest
      ? {
          id: dispute.refundRequest.id,
          order: {
            id: dispute.refundRequest.order.id,
            order_number: dispute.refundRequest.order.order_number,
            status: dispute.refundRequest.order.status,
            total_amount: dispute.refundRequest.order.total_amount,
            currency: dispute.refundRequest.order.currency,
            created_at: toISOStringSafe(dispute.refundRequest.order.created_at),
            updated_at: toISOStringSafe(dispute.refundRequest.order.updated_at),
            deleted_at:
              typeof dispute.refundRequest.order.deleted_at === "object" &&
              dispute.refundRequest.order.deleted_at !== null
                ? toISOStringSafe(dispute.refundRequest.order.deleted_at)
                : dispute.refundRequest.order.deleted_at === null
                  ? null
                  : undefined,
          },
          customer: {
            id: dispute.refundRequest.customer.id,
            name: dispute.refundRequest.customer.name,
          },
          seller: {
            id: dispute.refundRequest.seller.id,
            business_name: dispute.refundRequest.seller.business_name,
          },
          status: dispute.refundRequest.status,
          reason: dispute.refundRequest.reason,
          requested_amount: dispute.refundRequest.requested_amount,
          approved_amount:
            dispute.refundRequest.approved_amount === undefined
              ? undefined
              : dispute.refundRequest.approved_amount === null
                ? null
                : dispute.refundRequest.approved_amount,
          created_at: toISOStringSafe(dispute.refundRequest.created_at),
          updated_at: toISOStringSafe(dispute.refundRequest.updated_at),
          deleted_at:
            typeof dispute.refundRequest.deleted_at === "object" &&
            dispute.refundRequest.deleted_at !== null
              ? toISOStringSafe(dispute.refundRequest.deleted_at)
              : dispute.refundRequest.deleted_at === null
                ? null
                : undefined,
        }
      : null,
    customer: {
      id: dispute.customer.id,
      name: dispute.customer.name,
    },
    seller: {
      id: dispute.seller.id,
      business_name: dispute.seller.business_name,
    },
    admin: dispute.admin
      ? {
          id: dispute.admin.id,
          name: dispute.admin.name,
          email: dispute.admin.email,
        }
      : dispute.admin === null
        ? null
        : undefined,
    status: dispute.status,
    subject: dispute.subject,
    root_cause: dispute.root_cause,
    resolution_note:
      dispute.resolution_note === undefined
        ? undefined
        : dispute.resolution_note === null
          ? null
          : dispute.resolution_note,
    created_at: toISOStringSafe(dispute.created_at),
    updated_at: toISOStringSafe(dispute.updated_at),
    deleted_at:
      typeof dispute.deleted_at === "object" && dispute.deleted_at !== null
        ? toISOStringSafe(dispute.deleted_at)
        : dispute.deleted_at === null
          ? null
          : undefined,
  };
}
