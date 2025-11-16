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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSellerPayouts(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerPayout.IRequest;
}): Promise<IPageIShoppingMallSellerPayout.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_payouts.findMany({
      where: {
        shopping_mall_seller_id: props.seller.id,
        ...(props.body.status && { status: props.body.status }),
        ...(props.body.min_amount !== undefined ||
        props.body.max_amount !== undefined
          ? {
              net_payout_amount: {
                ...(props.body.min_amount !== undefined && {
                  gte: props.body.min_amount,
                }),
                ...(props.body.max_amount !== undefined && {
                  lte: props.body.max_amount,
                }),
              },
            }
          : {}),
        ...(props.body.payout_date_from && props.body.payout_date_to
          ? {
              AND: [
                { payout_period_start: { gte: props.body.payout_date_from } },
                { payout_period_end: { lte: props.body.payout_date_to } },
              ],
            }
          : props.body.payout_date_from
            ? { payout_period_start: { gte: props.body.payout_date_from } }
            : props.body.payout_date_to
              ? { payout_period_end: { lte: props.body.payout_date_to } }
              : {}),
        ...(props.body.initiated_date_from || props.body.initiated_date_to
          ? {
              initiated_at: {
                ...(props.body.initiated_date_from && {
                  gte: props.body.initiated_date_from,
                }),
                ...(props.body.initiated_date_to && {
                  lte: props.body.initiated_date_to,
                }),
              },
            }
          : {}),
        ...(props.body.completed_date_from || props.body.completed_date_to
          ? {
              completed_at: {
                ...(props.body.completed_date_from && {
                  gte: props.body.completed_date_from,
                }),
                ...(props.body.completed_date_to && {
                  lte: props.body.completed_date_to,
                }),
              },
            }
          : {}),
        ...(props.body.search
          ? {
              OR: [
                { bank_name: { contains: props.body.search } },
                { transfer_reference: { contains: props.body.search } },
                { notes: { contains: props.body.search } },
                { failure_reason: { contains: props.body.search } },
              ],
            }
          : {}),
      },
      skip,
      take: limit,
      orderBy: props.body.sort_by
        ? { [props.body.sort_by]: props.body.sort_order ?? "desc" }
        : { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_seller_payouts.count({
      where: {
        shopping_mall_seller_id: props.seller.id,
        ...(props.body.status && { status: props.body.status }),
        ...(props.body.min_amount !== undefined ||
        props.body.max_amount !== undefined
          ? {
              net_payout_amount: {
                ...(props.body.min_amount !== undefined && {
                  gte: props.body.min_amount,
                }),
                ...(props.body.max_amount !== undefined && {
                  lte: props.body.max_amount,
                }),
              },
            }
          : {}),
        ...(props.body.payout_date_from && props.body.payout_date_to
          ? {
              AND: [
                { payout_period_start: { gte: props.body.payout_date_from } },
                { payout_period_end: { lte: props.body.payout_date_to } },
              ],
            }
          : props.body.payout_date_from
            ? { payout_period_start: { gte: props.body.payout_date_from } }
            : props.body.payout_date_to
              ? { payout_period_end: { lte: props.body.payout_date_to } }
              : {}),
        ...(props.body.initiated_date_from || props.body.initiated_date_to
          ? {
              initiated_at: {
                ...(props.body.initiated_date_from && {
                  gte: props.body.initiated_date_from,
                }),
                ...(props.body.initiated_date_to && {
                  lte: props.body.initiated_date_to,
                }),
              },
            }
          : {}),
        ...(props.body.completed_date_from || props.body.completed_date_to
          ? {
              completed_at: {
                ...(props.body.completed_date_from && {
                  gte: props.body.completed_date_from,
                }),
                ...(props.body.completed_date_to && {
                  lte: props.body.completed_date_to,
                }),
              },
            }
          : {}),
        ...(props.body.search
          ? {
              OR: [
                { bank_name: { contains: props.body.search } },
                { transfer_reference: { contains: props.body.search } },
                { notes: { contains: props.body.search } },
                { failure_reason: { contains: props.body.search } },
              ],
            }
          : {}),
      },
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
