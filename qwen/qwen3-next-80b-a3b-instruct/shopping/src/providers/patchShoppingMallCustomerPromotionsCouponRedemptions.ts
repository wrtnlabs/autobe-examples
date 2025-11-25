import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponRedemption";
import { IPageIShoppingMallCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCouponRedemption";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerPromotionsCouponRedemptions(props: {
  customer: CustomerPayload;
  body: IShoppingMallCouponRedemption.IRequest;
}): Promise<IPageIShoppingMallCouponRedemption.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition with all possible filters
  const whereCondition = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.customer_id && { customer_id: props.body.customer_id }),
    ...(props.body.coupon_id && { coupon_id: props.body.coupon_id }),
    ...(props.body.order_id && { order_id: props.body.order_id }),
    ...(props.body.min_discount_amount !== undefined && {
      discount_amount: { gte: props.body.min_discount_amount },
    }),
    ...(props.body.max_discount_amount !== undefined && {
      discount_amount: { lte: props.body.max_discount_amount },
    }),
    ...(props.body.is_valid !== undefined && { is_valid: props.body.is_valid }),
    ...(props.body.min_applied_at && {
      applied_at: { gte: props.body.min_applied_at },
    }),
    ...(props.body.max_applied_at && {
      applied_at: { lte: props.body.max_applied_at },
    }),
  };

  // Determine sort
  let orderBy: any = { applied_at: "desc" };
  if (props.body.sort) {
    const [field, direction] = props.body.sort.split(":") as [
      "applied_at" | "discount_amount",
      "asc" | "desc",
    ];
    orderBy = { [field]: direction };
  }

  const [redemptions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coupon_redemptions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_coupon_redemptions.count({
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
    data: Array(redemptions.length).fill({}), // ISummary is an empty object {}, so return array of empty objects
  };
}
