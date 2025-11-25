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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSellersSellerIdPlatformCommissions(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallPlatformCommission.IRequest;
}): Promise<IPageIShoppingMallPlatformCommission.ISummary> {
  if (props.seller.id !== props.sellerId) {
    throw new HttpException(
      "You can only view your own commission records",
      403,
    );
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions = {
      shopping_mall_seller_id: props.sellerId,
    };

    const dynamicConditions: Record<string, unknown> = {};

    if (props.body.order_id) {
      dynamicConditions.shopping_mall_order_id = props.body.order_id;
    }

    if (props.body.commission_type) {
      dynamicConditions.commission_type = props.body.commission_type;
    }

    if (props.body.is_refunded !== undefined) {
      dynamicConditions.is_refunded = props.body.is_refunded;
    }

    if (props.body.currency) {
      dynamicConditions.currency = props.body.currency;
    }

    if (
      props.body.min_commission_amount !== undefined ||
      props.body.max_commission_amount !== undefined
    ) {
      dynamicConditions.commission_amount = {
        ...(props.body.min_commission_amount !== undefined && {
          gte: props.body.min_commission_amount,
        }),
        ...(props.body.max_commission_amount !== undefined && {
          lte: props.body.max_commission_amount,
        }),
      };
    }

    if (
      props.body.min_refunded_amount !== undefined ||
      props.body.max_refunded_amount !== undefined
    ) {
      dynamicConditions.refunded_amount = {
        ...(props.body.min_refunded_amount !== undefined && {
          gte: props.body.min_refunded_amount,
        }),
        ...(props.body.max_refunded_amount !== undefined && {
          lte: props.body.max_refunded_amount,
        }),
      };
    }

    if (
      props.body.min_order_subtotal !== undefined ||
      props.body.max_order_subtotal !== undefined
    ) {
      dynamicConditions.order_subtotal = {
        ...(props.body.min_order_subtotal !== undefined && {
          gte: props.body.min_order_subtotal,
        }),
        ...(props.body.max_order_subtotal !== undefined && {
          lte: props.body.max_order_subtotal,
        }),
      };
    }

    if (props.body.created_after || props.body.created_before) {
      dynamicConditions.created_at = {
        ...(props.body.created_after && {
          gte: new Date(props.body.created_after),
        }),
        ...(props.body.created_before && {
          lte: new Date(props.body.created_before),
        }),
      };
    }

    return { ...conditions, ...dynamicConditions };
  };

  const whereCondition = buildWhereCondition();

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_platform_commissions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.shopping_mall_platform_commissions.count({
      where: whereCondition,
    }),
  ]);

  return {
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
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
