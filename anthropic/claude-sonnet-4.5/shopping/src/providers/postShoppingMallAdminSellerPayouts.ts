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

export async function postShoppingMallAdminSellerPayouts(props: {
  admin: AdminPayload;
  body: IShoppingMallSellerPayout.ICreate;
}): Promise<IShoppingMallSellerPayout> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.body.shopping_mall_seller_id },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  if (seller.deleted_at !== null) {
    throw new HttpException("Seller account has been deleted", 400);
  }

  const expectedNet =
    props.body.gross_amount -
    props.body.commission_amount -
    props.body.refund_amount +
    props.body.adjustment_amount;

  if (Math.abs(expectedNet - props.body.net_payout_amount) > 0.01) {
    throw new HttpException(
      "Net payout amount does not match calculation",
      400,
    );
  }

  const validStatuses = ["pending", "processing", "completed", "failed"];
  if (!validStatuses.includes(props.body.status)) {
    throw new HttpException("Invalid payout status", 400);
  }

  const createdPayout =
    await MyGlobal.prisma.shopping_mall_seller_payouts.create({
      data: {
        id: v4(),
        shopping_mall_seller_id: props.body.shopping_mall_seller_id,
        payout_period_start: props.body.payout_period_start,
        payout_period_end: props.body.payout_period_end,
        gross_amount: props.body.gross_amount,
        commission_amount: props.body.commission_amount,
        refund_amount: props.body.refund_amount,
        adjustment_amount: props.body.adjustment_amount,
        net_payout_amount: props.body.net_payout_amount,
        currency: props.body.currency,
        status: props.body.status,
        bank_account_last_four: props.body.bank_account_last_four ?? null,
        bank_name: props.body.bank_name ?? null,
        transfer_reference: props.body.transfer_reference ?? null,
        failure_reason: props.body.failure_reason ?? null,
        notes: props.body.notes ?? null,
        initiated_at: props.body.initiated_at ?? null,
        completed_at: props.body.completed_at ?? null,
        created_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: createdPayout.id,
    shopping_mall_seller_id: createdPayout.shopping_mall_seller_id,
    seller: {
      id: seller.id,
      store_name: seller.store_name,
      email: seller.email,
      status: seller.status as
        | "pending"
        | "approved"
        | "rejected"
        | "suspended",
      email_verified: seller.email_verified,
    },
    payout_period_start: toISOStringSafe(createdPayout.payout_period_start),
    payout_period_end: toISOStringSafe(createdPayout.payout_period_end),
    gross_amount: createdPayout.gross_amount,
    commission_amount: createdPayout.commission_amount,
    refund_amount: createdPayout.refund_amount,
    adjustment_amount: createdPayout.adjustment_amount,
    net_payout_amount: createdPayout.net_payout_amount,
    currency: createdPayout.currency,
    status: createdPayout.status as
      | "pending"
      | "processing"
      | "completed"
      | "failed",
    bank_account_last_four:
      createdPayout.bank_account_last_four === null
        ? undefined
        : createdPayout.bank_account_last_four,
    bank_name:
      createdPayout.bank_name === null ? undefined : createdPayout.bank_name,
    transfer_reference:
      createdPayout.transfer_reference === null
        ? undefined
        : createdPayout.transfer_reference,
    failure_reason:
      createdPayout.failure_reason === null
        ? undefined
        : createdPayout.failure_reason,
    notes: createdPayout.notes === null ? undefined : createdPayout.notes,
    initiated_at:
      createdPayout.initiated_at === null
        ? undefined
        : toISOStringSafe(createdPayout.initiated_at),
    completed_at:
      createdPayout.completed_at === null
        ? undefined
        : toISOStringSafe(createdPayout.completed_at),
    created_at: toISOStringSafe(createdPayout.created_at),
  };
}
