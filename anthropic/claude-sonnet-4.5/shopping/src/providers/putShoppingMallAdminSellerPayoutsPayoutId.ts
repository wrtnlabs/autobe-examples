import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminSellerPayoutsPayoutId(props: {
  admin: AdminPayload;
  payoutId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerPayout.IUpdate;
}): Promise<IShoppingMallSellerPayout> {
  const existing =
    await MyGlobal.prisma.shopping_mall_seller_payouts.findUnique({
      where: { id: props.payoutId },
    });

  if (!existing) {
    throw new HttpException("Seller payout not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_seller_payouts.update({
    where: { id: props.payoutId },
    data: {
      ...(props.body.payout_period_start !== undefined &&
        props.body.payout_period_start !== null && {
          payout_period_start: props.body.payout_period_start,
        }),
      ...(props.body.payout_period_end !== undefined &&
        props.body.payout_period_end !== null && {
          payout_period_end: props.body.payout_period_end,
        }),
      ...(props.body.gross_amount !== undefined &&
        props.body.gross_amount !== null && {
          gross_amount: props.body.gross_amount,
        }),
      ...(props.body.commission_amount !== undefined &&
        props.body.commission_amount !== null && {
          commission_amount: props.body.commission_amount,
        }),
      ...(props.body.refund_amount !== undefined &&
        props.body.refund_amount !== null && {
          refund_amount: props.body.refund_amount,
        }),
      ...(props.body.adjustment_amount !== undefined &&
        props.body.adjustment_amount !== null && {
          adjustment_amount: props.body.adjustment_amount,
        }),
      ...(props.body.net_payout_amount !== undefined &&
        props.body.net_payout_amount !== null && {
          net_payout_amount: props.body.net_payout_amount,
        }),
      ...(props.body.currency !== undefined &&
        props.body.currency !== null && { currency: props.body.currency }),
      ...(props.body.status !== undefined &&
        props.body.status !== null && { status: props.body.status }),
      ...(props.body.bank_account_last_four !== undefined && {
        bank_account_last_four: props.body.bank_account_last_four,
      }),
      ...(props.body.bank_name !== undefined && {
        bank_name: props.body.bank_name,
      }),
      ...(props.body.transfer_reference !== undefined && {
        transfer_reference: props.body.transfer_reference,
      }),
      ...(props.body.failure_reason !== undefined && {
        failure_reason: props.body.failure_reason,
      }),
      ...(props.body.notes !== undefined && { notes: props.body.notes }),
      ...(props.body.initiated_at !== undefined && {
        initiated_at: props.body.initiated_at,
      }),
      ...(props.body.completed_at !== undefined && {
        completed_at: props.body.completed_at,
      }),
    },
  });

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: updated.shopping_mall_seller_id },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  const sellerStatus: "pending" | "approved" | "rejected" | "suspended" =
    seller.status === "pending"
      ? "pending"
      : seller.status === "approved"
        ? "approved"
        : seller.status === "rejected"
          ? "rejected"
          : "suspended";

  const payoutStatus: "pending" | "processing" | "completed" | "failed" =
    updated.status === "pending"
      ? "pending"
      : updated.status === "processing"
        ? "processing"
        : updated.status === "completed"
          ? "completed"
          : "failed";

  return {
    id: updated.id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    seller: {
      id: seller.id,
      store_name: seller.store_name,
      email: seller.email,
      status: sellerStatus,
      email_verified: seller.email_verified,
    },
    payout_period_start: toISOStringSafe(updated.payout_period_start),
    payout_period_end: toISOStringSafe(updated.payout_period_end),
    gross_amount: updated.gross_amount,
    commission_amount: updated.commission_amount,
    refund_amount: updated.refund_amount,
    adjustment_amount: updated.adjustment_amount,
    net_payout_amount: updated.net_payout_amount,
    currency: updated.currency,
    status: payoutStatus,
    bank_account_last_four: updated.bank_account_last_four ?? undefined,
    bank_name: updated.bank_name ?? undefined,
    transfer_reference: updated.transfer_reference ?? undefined,
    failure_reason: updated.failure_reason ?? undefined,
    notes: updated.notes ?? undefined,
    initiated_at: updated.initiated_at
      ? toISOStringSafe(updated.initiated_at)
      : undefined,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
