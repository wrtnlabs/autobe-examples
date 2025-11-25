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

export async function patchShoppingMallAdminSellersSellerIdPlatformCommissions(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallPlatformCommission.IRequest;
}): Promise<IPageIShoppingMallPlatformCommission.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Prisma.shopping_mall_platform_commissionsWhereInput = {
      shopping_mall_seller_id: props.sellerId,
    };

    if (props.body.seller_id) {
      conditions.shopping_mall_seller_id = props.body.seller_id;
    }

    if (props.body.order_id) {
      conditions.shopping_mall_order_id = props.body.order_id;
    }

    if (props.body.commission_type) {
      conditions.commission_type = props.body.commission_type;
    }

    if (
      props.body.is_refunded !== undefined &&
      props.body.is_refunded !== null
    ) {
      conditions.is_refunded = props.body.is_refunded;
    }

    if (props.body.currency) {
      conditions.currency = props.body.currency;
    }

    if (
      props.body.min_commission_amount !== undefined ||
      props.body.max_commission_amount !== undefined
    ) {
      conditions.commission_amount = {};
      if (props.body.min_commission_amount !== undefined) {
        conditions.commission_amount.gte = props.body.min_commission_amount;
      }
      if (props.body.max_commission_amount !== undefined) {
        conditions.commission_amount.lte = props.body.max_commission_amount;
      }
    }

    if (
      props.body.min_refunded_amount !== undefined ||
      props.body.max_refunded_amount !== undefined
    ) {
      conditions.refunded_amount = {};
      if (props.body.min_refunded_amount !== undefined) {
        conditions.refunded_amount.gte = props.body.min_refunded_amount;
      }
      if (props.body.max_refunded_amount !== undefined) {
        conditions.refunded_amount.lte = props.body.max_refunded_amount;
      }
    }

    if (
      props.body.min_order_subtotal !== undefined ||
      props.body.max_order_subtotal !== undefined
    ) {
      conditions.order_subtotal = {};
      if (props.body.min_order_subtotal !== undefined) {
        conditions.order_subtotal.gte = props.body.min_order_subtotal;
      }
      if (props.body.max_order_subtotal !== undefined) {
        conditions.order_subtotal.lte = props.body.max_order_subtotal;
      }
    }

    if (props.body.created_after || props.body.created_before) {
      conditions.created_at = {};
      if (props.body.created_after) {
        conditions.created_at.gte = props.body.created_after;
      }
      if (props.body.created_before) {
        conditions.created_at.lte = props.body.created_before;
      }
    }

    return conditions;
  };

  const where = buildWhereCondition();

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const orderBy: Prisma.shopping_mall_platform_commissionsOrderByWithRelationInput =
    {
      [sortBy]: sortOrder,
    };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_platform_commissions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_platform_commissions.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((commission) => {
      const orderSubtotal =
        typeof commission.order_subtotal === "number"
          ? commission.order_subtotal
          : Number(commission.order_subtotal);

      const commissionRate =
        typeof commission.commission_rate === "number"
          ? commission.commission_rate
          : Number(commission.commission_rate);

      const commissionAmount =
        typeof commission.commission_amount === "number"
          ? commission.commission_amount
          : Number(commission.commission_amount);

      const refundedAmount =
        typeof commission.refunded_amount === "number"
          ? commission.refunded_amount
          : Number(commission.refunded_amount);

      return {
        id: commission.id,
        shopping_mall_payment_transaction_id:
          commission.shopping_mall_payment_transaction_id,
        shopping_mall_order_id: commission.shopping_mall_order_id,
        shopping_mall_seller_id: commission.shopping_mall_seller_id,
        order_subtotal: orderSubtotal,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        currency: commission.currency,
        commission_type: commission.commission_type,
        is_refunded: commission.is_refunded,
        refunded_amount: refundedAmount,
        created_at: toISOStringSafe(commission.created_at),
      };
    }),
  };
}
