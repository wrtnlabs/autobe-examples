import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import { IPageIShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdRefundTransactions(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundTransaction.IRequest;
}): Promise<IPageIShoppingMallRefundTransaction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_refund_transactions.findMany({
      where: {
        shopping_mall_order_id: props.orderId,
        ...(props.body.status !== undefined &&
          props.body.status !== null && {
            status: props.body.status,
          }),
        ...(props.body.refund_request_id !== undefined &&
          props.body.refund_request_id !== null && {
            shopping_mall_refund_request_id: props.body.refund_request_id,
          }),
        ...(props.body.order_id !== undefined &&
          props.body.order_id !== null && {
            shopping_mall_order_id: props.body.order_id,
          }),
        ...(props.body.buyer_id !== undefined &&
          props.body.buyer_id !== null && {
            shopping_mall_refund_request: {
              shopping_mall_order: {
                shopping_mall_buyer_id: props.body.buyer_id,
              },
            },
          }),
        ...((props.body.min_amount !== undefined &&
          props.body.min_amount !== null) ||
        (props.body.max_amount !== undefined && props.body.max_amount !== null)
          ? {
              refund_amount: {
                ...(props.body.min_amount !== undefined &&
                  props.body.min_amount !== null && {
                    gte: props.body.min_amount,
                  }),
                ...(props.body.max_amount !== undefined &&
                  props.body.max_amount !== null && {
                    lte: props.body.max_amount,
                  }),
              },
            }
          : {}),
        ...(props.body.provider !== undefined &&
          props.body.provider !== null && {
            provider: props.body.provider,
          }),
        ...((props.body.initiated_from !== undefined &&
          props.body.initiated_from !== null) ||
        (props.body.initiated_to !== undefined &&
          props.body.initiated_to !== null)
          ? {
              initiated_at: {
                ...(props.body.initiated_from !== undefined &&
                  props.body.initiated_from !== null && {
                    gte: new Date(props.body.initiated_from),
                  }),
                ...(props.body.initiated_to !== undefined &&
                  props.body.initiated_to !== null && {
                    lte: new Date(props.body.initiated_to),
                  }),
              },
            }
          : {}),
        ...((props.body.completed_from !== undefined &&
          props.body.completed_from !== null) ||
        (props.body.completed_to !== undefined &&
          props.body.completed_to !== null)
          ? {
              completed_at: {
                ...(props.body.completed_from !== undefined &&
                  props.body.completed_from !== null && {
                    gte: new Date(props.body.completed_from),
                  }),
                ...(props.body.completed_to !== undefined &&
                  props.body.completed_to !== null && {
                    lte: new Date(props.body.completed_to),
                  }),
              },
            }
          : {}),
      },
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    MyGlobal.prisma.shopping_mall_refund_transactions.count({
      where: {
        shopping_mall_order_id: props.orderId,
        ...(props.body.status !== undefined &&
          props.body.status !== null && {
            status: props.body.status,
          }),
        ...(props.body.refund_request_id !== undefined &&
          props.body.refund_request_id !== null && {
            shopping_mall_refund_request_id: props.body.refund_request_id,
          }),
        ...(props.body.order_id !== undefined &&
          props.body.order_id !== null && {
            shopping_mall_order_id: props.body.order_id,
          }),
        ...(props.body.buyer_id !== undefined &&
          props.body.buyer_id !== null && {
            shopping_mall_refund_request: {
              shopping_mall_order: {
                shopping_mall_buyer_id: props.body.buyer_id,
              },
            },
          }),
        ...((props.body.min_amount !== undefined &&
          props.body.min_amount !== null) ||
        (props.body.max_amount !== undefined && props.body.max_amount !== null)
          ? {
              refund_amount: {
                ...(props.body.min_amount !== undefined &&
                  props.body.min_amount !== null && {
                    gte: props.body.min_amount,
                  }),
                ...(props.body.max_amount !== undefined &&
                  props.body.max_amount !== null && {
                    lte: props.body.max_amount,
                  }),
              },
            }
          : {}),
        ...(props.body.provider !== undefined &&
          props.body.provider !== null && {
            provider: props.body.provider,
          }),
        ...((props.body.initiated_from !== undefined &&
          props.body.initiated_from !== null) ||
        (props.body.initiated_to !== undefined &&
          props.body.initiated_to !== null)
          ? {
              initiated_at: {
                ...(props.body.initiated_from !== undefined &&
                  props.body.initiated_from !== null && {
                    gte: new Date(props.body.initiated_from),
                  }),
                ...(props.body.initiated_to !== undefined &&
                  props.body.initiated_to !== null && {
                    lte: new Date(props.body.initiated_to),
                  }),
              },
            }
          : {}),
        ...((props.body.completed_from !== undefined &&
          props.body.completed_from !== null) ||
        (props.body.completed_to !== undefined &&
          props.body.completed_to !== null)
          ? {
              completed_at: {
                ...(props.body.completed_from !== undefined &&
                  props.body.completed_from !== null && {
                    gte: new Date(props.body.completed_from),
                  }),
                ...(props.body.completed_to !== undefined &&
                  props.body.completed_to !== null && {
                    lte: new Date(props.body.completed_to),
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((transaction) => ({
      id: transaction.id,
      shopping_mall_refund_request_id:
        transaction.shopping_mall_refund_request_id,
      shopping_mall_order_id: transaction.shopping_mall_order_id,
      refund_amount: transaction.refund_amount,
      currency: transaction.currency,
      status: typia.assert<"processing" | "completed" | "failed">(
        transaction.status,
      ),
      provider: transaction.provider,
      initiated_at: toISOStringSafe(transaction.initiated_at),
      completed_at:
        transaction.completed_at !== null
          ? toISOStringSafe(transaction.completed_at)
          : null,
    })),
  };
}
