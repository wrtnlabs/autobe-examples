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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerSellerPayoutsPayoutId(props: {
  seller: SellerPayload;
  payoutId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerPayout> {
  const payout = await MyGlobal.prisma.shopping_mall_seller_payouts.findUnique({
    where: {
      id: props.payoutId,
    },
  });

  if (!payout) {
    throw new HttpException("Payout not found", 404);
  }

  if (payout.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: {
      id: payout.shopping_mall_seller_id,
    },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  return {
    id: payout.id as string & tags.Format<"uuid">,
    shopping_mall_seller_id: payout.shopping_mall_seller_id as string &
      tags.Format<"uuid">,
    seller: {
      id: seller.id as string & tags.Format<"uuid">,
      store_name: seller.store_name,
      email: seller.email as string & tags.Format<"email">,
      status: seller.status as
        | "pending"
        | "approved"
        | "rejected"
        | "suspended",
      email_verified: seller.email_verified,
    },
    payout_period_start: toISOStringSafe(payout.payout_period_start),
    payout_period_end: toISOStringSafe(payout.payout_period_end),
    gross_amount: payout.gross_amount,
    commission_amount: payout.commission_amount,
    refund_amount: payout.refund_amount,
    adjustment_amount: payout.adjustment_amount,
    net_payout_amount: payout.net_payout_amount,
    currency: payout.currency,
    status: typia.assert<"pending" | "processing" | "completed" | "failed">(
      payout.status,
    ),
    bank_account_last_four:
      payout.bank_account_last_four === null
        ? undefined
        : payout.bank_account_last_four,
    bank_name: payout.bank_name === null ? undefined : payout.bank_name,
    transfer_reference:
      payout.transfer_reference === null
        ? undefined
        : payout.transfer_reference,
    failure_reason:
      payout.failure_reason === null ? undefined : payout.failure_reason,
    notes: payout.notes === null ? undefined : payout.notes,
    initiated_at: payout.initiated_at
      ? toISOStringSafe(payout.initiated_at)
      : undefined,
    completed_at: payout.completed_at
      ? toISOStringSafe(payout.completed_at)
      : undefined,
    created_at: toISOStringSafe(payout.created_at),
  };
}
