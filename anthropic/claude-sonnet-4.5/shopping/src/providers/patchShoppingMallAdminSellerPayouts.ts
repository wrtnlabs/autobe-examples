import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";
import { IPageIShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayout";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellerPayouts(props: {
  admin: AdminPayload;
  body: IShoppingMallSellerPayout.IRequest;
}): Promise<IPageIShoppingMallSellerPayout.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {};

  if (props.body.seller_id) {
    whereCondition.shopping_mall_seller_id = props.body.seller_id;
  }

  if (props.body.status) {
    whereCondition.status = props.body.status;
  }

  if (
    props.body.min_amount !== undefined ||
    props.body.max_amount !== undefined
  ) {
    whereCondition.net_payout_amount = {};
    if (props.body.min_amount !== undefined) {
      (whereCondition.net_payout_amount as Record<string, unknown>).gte =
        props.body.min_amount;
    }
    if (props.body.max_amount !== undefined) {
      (whereCondition.net_payout_amount as Record<string, unknown>).lte =
        props.body.max_amount;
    }
  }

  if (props.body.payout_date_from || props.body.payout_date_to) {
    whereCondition.payout_period_start = {};
    if (props.body.payout_date_from) {
      (whereCondition.payout_period_start as Record<string, unknown>).gte =
        props.body.payout_date_from;
    }
    if (props.body.payout_date_to) {
      (whereCondition.payout_period_start as Record<string, unknown>).lte =
        props.body.payout_date_to;
    }
  }

  if (props.body.initiated_date_from || props.body.initiated_date_to) {
    whereCondition.initiated_at = {};
    if (props.body.initiated_date_from) {
      (whereCondition.initiated_at as Record<string, unknown>).gte =
        props.body.initiated_date_from;
    }
    if (props.body.initiated_date_to) {
      (whereCondition.initiated_at as Record<string, unknown>).lte =
        props.body.initiated_date_to;
    }
  }

  if (props.body.completed_date_from || props.body.completed_date_to) {
    whereCondition.completed_at = {};
    if (props.body.completed_date_from) {
      (whereCondition.completed_at as Record<string, unknown>).gte =
        props.body.completed_date_from;
    }
    if (props.body.completed_date_to) {
      (whereCondition.completed_at as Record<string, unknown>).lte =
        props.body.completed_date_to;
    }
  }

  if (props.body.search) {
    whereCondition.OR = [
      { transfer_reference: { contains: props.body.search } },
      { bank_name: { contains: props.body.search } },
      { notes: { contains: props.body.search } },
    ];
  }

  const orderByField = props.body.sort_by ?? "created_at";
  const orderByDirection = props.body.sort_order ?? "desc";
  const orderBy = { [orderByField]: orderByDirection };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_payouts.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_seller_payouts.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((payout) => ({
      id: payout.id,
      shopping_mall_seller_id: payout.shopping_mall_seller_id,
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
      bank_account_last_four: payout.bank_account_last_four,
      bank_name: payout.bank_name,
      transfer_reference: payout.transfer_reference,
      failure_reason: payout.failure_reason,
      notes: payout.notes,
      initiated_at: payout.initiated_at
        ? toISOStringSafe(payout.initiated_at)
        : null,
      completed_at: payout.completed_at
        ? toISOStringSafe(payout.completed_at)
        : null,
      created_at: toISOStringSafe(payout.created_at),
    })),
  };
}
