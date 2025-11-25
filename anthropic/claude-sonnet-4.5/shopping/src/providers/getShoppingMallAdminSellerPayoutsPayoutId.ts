import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSellerPayoutsPayoutId(props: {
  admin: AdminPayload;
  payoutId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerPayout> {
  const payout = await MyGlobal.prisma.shopping_mall_seller_payouts.findUnique({
    where: {
      id: props.payoutId,
    },
    include: {
      seller: true,
    },
  });

  if (!payout) {
    throw new HttpException("Seller payout not found", 404);
  }

  return {
    id: payout.id,
    shopping_mall_seller_id: payout.shopping_mall_seller_id,
    seller: {
      id: payout.seller.id,
      store_name: payout.seller.store_name,
      email: payout.seller.email,
      status: payout.seller.status as
        | "pending"
        | "approved"
        | "rejected"
        | "suspended",
      email_verified: payout.seller.email_verified,
    },
    payout_period_start: toISOStringSafe(payout.payout_period_start),
    payout_period_end: toISOStringSafe(payout.payout_period_end),
    gross_amount: payout.gross_amount,
    commission_amount: payout.commission_amount,
    refund_amount: payout.refund_amount,
    adjustment_amount: payout.adjustment_amount,
    net_payout_amount: payout.net_payout_amount,
    currency: payout.currency,
    status: payout.status as "pending" | "processing" | "completed" | "failed",
    bank_account_last_four: payout.bank_account_last_four ?? undefined,
    bank_name: payout.bank_name ?? undefined,
    transfer_reference: payout.transfer_reference ?? undefined,
    failure_reason: payout.failure_reason ?? undefined,
    notes: payout.notes ?? undefined,
    initiated_at: payout.initiated_at
      ? toISOStringSafe(payout.initiated_at)
      : null,
    completed_at: payout.completed_at
      ? toISOStringSafe(payout.completed_at)
      : null,
    created_at: toISOStringSafe(payout.created_at),
  };
}
