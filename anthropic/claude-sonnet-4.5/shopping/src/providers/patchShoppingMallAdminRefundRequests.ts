import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminRefundRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {};

  if (props.body.buyer_id) {
    whereCondition.shopping_mall_buyer_id = props.body.buyer_id;
  }

  if (props.body.order_id) {
    whereCondition.shopping_mall_order_id = props.body.order_id;
  }

  if (props.body.status) {
    whereCondition.status = props.body.status;
  }

  if (props.body.min_amount !== undefined && props.body.min_amount !== null) {
    whereCondition.requested_amount = whereCondition.requested_amount || {};
    (whereCondition.requested_amount as Record<string, unknown>).gte =
      props.body.min_amount;
  }

  if (props.body.max_amount !== undefined && props.body.max_amount !== null) {
    whereCondition.requested_amount = whereCondition.requested_amount || {};
    (whereCondition.requested_amount as Record<string, unknown>).lte =
      props.body.max_amount;
  }

  if (props.body.submitted_after) {
    whereCondition.requested_at = whereCondition.requested_at || {};
    (whereCondition.requested_at as Record<string, unknown>).gte =
      props.body.submitted_after;
  }

  if (props.body.submitted_before) {
    whereCondition.requested_at = whereCondition.requested_at || {};
    (whereCondition.requested_at as Record<string, unknown>).lte =
      props.body.submitted_before;
  }

  if (props.body.search) {
    whereCondition.OR = [
      { refund_explanation: { contains: props.body.search } },
    ];
  }

  const sortByMapping: Record<string, string> = {
    created_at: "requested_at",
    amount: "requested_amount",
    status: "status",
    updated_at: "updated_at",
  };

  const orderByField = props.body.sort_by || "created_at";
  const orderByDirection = props.body.sort_order || "desc";
  const prismaOrderByField = sortByMapping[orderByField] || "requested_at";

  const orderBy: Record<string, string> = {
    [prismaOrderByField]: orderByDirection,
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_refund_requests.count({
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
    data: data.map((record) => ({
      id: record.id,
      refund_request_number: record.refund_request_number,
      refund_reason: typia.assert<
        | "other"
        | "defective_product"
        | "not_as_described"
        | "wrong_item"
        | "damaged_in_shipping"
        | "never_arrived"
        | "buyer_changed_mind"
      >(record.refund_reason),
      requested_amount: record.requested_amount,
      status: typia.assert<
        | "approved"
        | "processing"
        | "cancelled"
        | "completed"
        | "denied"
        | "requested"
        | "under_review"
        | "information_requested"
      >(record.status),
      requested_at: toISOStringSafe(record.requested_at),
      shopping_mall_order_id: record.shopping_mall_order_id,
      shopping_mall_order_seller_id:
        record.shopping_mall_order_seller_id === null
          ? undefined
          : record.shopping_mall_order_seller_id,
      shopping_mall_buyer_id: record.shopping_mall_buyer_id,
      refund_explanation: record.refund_explanation,
      admin_decision:
        record.admin_decision === null
          ? undefined
          : typia.assert<
              | "pending"
              | "approve_full"
              | "approve_partial"
              | "deny"
              | "escalate"
            >(record.admin_decision),
      approved_refund_amount:
        record.approved_refund_amount === null
          ? undefined
          : record.approved_refund_amount,
      reviewed_at: record.reviewed_at
        ? toISOStringSafe(record.reviewed_at)
        : null,
    })),
  };
}
