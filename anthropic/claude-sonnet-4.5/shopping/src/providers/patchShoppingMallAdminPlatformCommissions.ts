import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";
import { IPageIShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformCommission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPlatformCommissions(props: {
  admin: AdminPayload;
  body: IShoppingMallPlatformCommission.IRequest;
}): Promise<IPageIShoppingMallPlatformCommission.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_platform_commissions.findMany({
      where: {
        ...(props.body.order_id && {
          shopping_mall_order_id: props.body.order_id,
        }),
        ...(props.body.seller_id && {
          shopping_mall_seller_id: props.body.seller_id,
        }),
        ...(props.body.commission_type && {
          commission_type: props.body.commission_type,
        }),
        ...(props.body.is_refunded !== undefined && {
          is_refunded: props.body.is_refunded,
        }),
        ...(props.body.currency && {
          currency: props.body.currency,
        }),
        ...((props.body.min_commission_amount !== undefined ||
          props.body.max_commission_amount !== undefined) && {
          commission_amount: {
            ...(props.body.min_commission_amount !== undefined && {
              gte: props.body.min_commission_amount,
            }),
            ...(props.body.max_commission_amount !== undefined && {
              lte: props.body.max_commission_amount,
            }),
          },
        }),
        ...((props.body.min_refunded_amount !== undefined ||
          props.body.max_refunded_amount !== undefined) && {
          refunded_amount: {
            ...(props.body.min_refunded_amount !== undefined && {
              gte: props.body.min_refunded_amount,
            }),
            ...(props.body.max_refunded_amount !== undefined && {
              lte: props.body.max_refunded_amount,
            }),
          },
        }),
        ...((props.body.min_order_subtotal !== undefined ||
          props.body.max_order_subtotal !== undefined) && {
          order_subtotal: {
            ...(props.body.min_order_subtotal !== undefined && {
              gte: props.body.min_order_subtotal,
            }),
            ...(props.body.max_order_subtotal !== undefined && {
              lte: props.body.max_order_subtotal,
            }),
          },
        }),
        ...((props.body.created_after !== undefined ||
          props.body.created_before !== undefined) && {
          created_at: {
            ...(props.body.created_after !== undefined && {
              gte: props.body.created_after,
            }),
            ...(props.body.created_before !== undefined && {
              lte: props.body.created_before,
            }),
          },
        }),
      },
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    MyGlobal.prisma.shopping_mall_platform_commissions.count({
      where: {
        ...(props.body.order_id && {
          shopping_mall_order_id: props.body.order_id,
        }),
        ...(props.body.seller_id && {
          shopping_mall_seller_id: props.body.seller_id,
        }),
        ...(props.body.commission_type && {
          commission_type: props.body.commission_type,
        }),
        ...(props.body.is_refunded !== undefined && {
          is_refunded: props.body.is_refunded,
        }),
        ...(props.body.currency && {
          currency: props.body.currency,
        }),
        ...((props.body.min_commission_amount !== undefined ||
          props.body.max_commission_amount !== undefined) && {
          commission_amount: {
            ...(props.body.min_commission_amount !== undefined && {
              gte: props.body.min_commission_amount,
            }),
            ...(props.body.max_commission_amount !== undefined && {
              lte: props.body.max_commission_amount,
            }),
          },
        }),
        ...((props.body.min_refunded_amount !== undefined ||
          props.body.max_refunded_amount !== undefined) && {
          refunded_amount: {
            ...(props.body.min_refunded_amount !== undefined && {
              gte: props.body.min_refunded_amount,
            }),
            ...(props.body.max_refunded_amount !== undefined && {
              lte: props.body.max_refunded_amount,
            }),
          },
        }),
        ...((props.body.min_order_subtotal !== undefined ||
          props.body.max_order_subtotal !== undefined) && {
          order_subtotal: {
            ...(props.body.min_order_subtotal !== undefined && {
              gte: props.body.min_order_subtotal,
            }),
            ...(props.body.max_order_subtotal !== undefined && {
              lte: props.body.max_order_subtotal,
            }),
          },
        }),
        ...((props.body.created_after !== undefined ||
          props.body.created_before !== undefined) && {
          created_at: {
            ...(props.body.created_after !== undefined && {
              gte: props.body.created_after,
            }),
            ...(props.body.created_before !== undefined && {
              lte: props.body.created_before,
            }),
          },
        }),
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
    data: data.map((commission) => ({
      id: commission.id,
      shopping_mall_payment_transaction_id:
        commission.shopping_mall_payment_transaction_id,
      shopping_mall_order_id: commission.shopping_mall_order_id,
      shopping_mall_seller_id: commission.shopping_mall_seller_id,
      order_subtotal: commission.order_subtotal,
      commission_rate: commission.commission_rate,
      commission_amount: commission.commission_amount,
      currency: commission.currency,
      commission_type: commission.commission_type,
      is_refunded: commission.is_refunded,
      refunded_amount: commission.refunded_amount,
      created_at: toISOStringSafe(commission.created_at),
    })),
  };
}
