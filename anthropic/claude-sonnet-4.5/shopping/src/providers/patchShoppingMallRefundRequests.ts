import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallRefundRequests(props: {
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest> {
  const { body } = props;

  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "requested_at";
  const sortOrder = body.sort_order ?? "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where: {
        ...(body.refund_status !== undefined &&
          body.refund_status !== null &&
          body.refund_status.length > 0 && {
            refund_status: { in: body.refund_status },
          }),
        ...(body.order_id !== undefined &&
          body.order_id !== null && {
            shopping_mall_order_id: body.order_id,
          }),
        ...(body.refund_reason !== undefined &&
          body.refund_reason !== null &&
          body.refund_reason.length > 0 && {
            refund_reason: { in: body.refund_reason },
          }),
        ...((body.requested_at_from !== undefined &&
          body.requested_at_from !== null) ||
        (body.requested_at_to !== undefined && body.requested_at_to !== null)
          ? {
              requested_at: {
                ...(body.requested_at_from !== undefined &&
                  body.requested_at_from !== null && {
                    gte: body.requested_at_from,
                  }),
                ...(body.requested_at_to !== undefined &&
                  body.requested_at_to !== null && {
                    lte: body.requested_at_to,
                  }),
              },
            }
          : {}),
        ...((body.refund_amount_min !== undefined &&
          body.refund_amount_min !== null) ||
        (body.refund_amount_max !== undefined &&
          body.refund_amount_max !== null)
          ? {
              refund_amount_requested: {
                ...(body.refund_amount_min !== undefined &&
                  body.refund_amount_min !== null && {
                    gte: body.refund_amount_min,
                  }),
                ...(body.refund_amount_max !== undefined &&
                  body.refund_amount_max !== null && {
                    lte: body.refund_amount_max,
                  }),
              },
            }
          : {}),
        ...(body.return_required !== undefined &&
          body.return_required !== null && {
            return_required: body.return_required,
          }),
      },
      orderBy: { [sortBy]: sortOrder },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        ...(body.refund_status !== undefined &&
          body.refund_status !== null &&
          body.refund_status.length > 0 && {
            refund_status: { in: body.refund_status },
          }),
        ...(body.order_id !== undefined &&
          body.order_id !== null && {
            shopping_mall_order_id: body.order_id,
          }),
        ...(body.refund_reason !== undefined &&
          body.refund_reason !== null &&
          body.refund_reason.length > 0 && {
            refund_reason: { in: body.refund_reason },
          }),
        ...((body.requested_at_from !== undefined &&
          body.requested_at_from !== null) ||
        (body.requested_at_to !== undefined && body.requested_at_to !== null)
          ? {
              requested_at: {
                ...(body.requested_at_from !== undefined &&
                  body.requested_at_from !== null && {
                    gte: body.requested_at_from,
                  }),
                ...(body.requested_at_to !== undefined &&
                  body.requested_at_to !== null && {
                    lte: body.requested_at_to,
                  }),
              },
            }
          : {}),
        ...((body.refund_amount_min !== undefined &&
          body.refund_amount_min !== null) ||
        (body.refund_amount_max !== undefined &&
          body.refund_amount_max !== null)
          ? {
              refund_amount_requested: {
                ...(body.refund_amount_min !== undefined &&
                  body.refund_amount_min !== null && {
                    gte: body.refund_amount_min,
                  }),
                ...(body.refund_amount_max !== undefined &&
                  body.refund_amount_max !== null && {
                    lte: body.refund_amount_max,
                  }),
              },
            }
          : {}),
        ...(body.return_required !== undefined &&
          body.return_required !== null && {
            return_required: body.return_required,
          }),
      },
    }),
  ]);

  const data = results.map((record) => ({
    id: record.id,
    shopping_mall_order_id: record.shopping_mall_order_id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    reviewer_seller_id: record.reviewer_seller_id ?? undefined,
    reviewer_admin_id: record.reviewer_admin_id ?? undefined,
    refund_reason: record.refund_reason as
      | "defective_damaged"
      | "wrong_item"
      | "does_not_match_description"
      | "changed_mind"
      | "found_better_price"
      | "quality_not_expected"
      | "other",
    refund_description: record.refund_description,
    refund_amount_requested: record.refund_amount_requested,
    refund_amount_approved: record.refund_amount_approved ?? undefined,
    refund_status: record.refund_status as
      | "pending_review"
      | "pending_seller_response"
      | "approved"
      | "rejected"
      | "processing"
      | "completed",
    return_required: record.return_required,
    return_tracking_number: record.return_tracking_number ?? undefined,
    review_notes: record.review_notes ?? undefined,
    requested_at: toISOStringSafe(record.requested_at),
    seller_response_deadline: toISOStringSafe(record.seller_response_deadline),
    reviewed_at: record.reviewed_at
      ? toISOStringSafe(record.reviewed_at)
      : undefined,
    completed_at: record.completed_at
      ? toISOStringSafe(record.completed_at)
      : undefined,
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
