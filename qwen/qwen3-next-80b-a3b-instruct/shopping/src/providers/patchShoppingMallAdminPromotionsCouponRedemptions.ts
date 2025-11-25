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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPromotionsCouponRedemptions(props: {
  admin: AdminPayload;
  body: IShoppingMallCouponRedemption.IRequest;
}): Promise<IPageIShoppingMallCouponRedemption.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build dynamic where condition based on provided filters
  const whereCondition: Record<string, unknown> = {
    deleted_at: null,
  };

  // Filter by customer_id if provided
  if (props.body.customer_id) {
    whereCondition.customer_id = props.body.customer_id;
  }

  // Filter by coupon_id if provided
  if (props.body.coupon_id) {
    whereCondition.coupon_id = props.body.coupon_id;
  }

  // Filter by order_id if provided
  if (props.body.order_id) {
    whereCondition.order_id = props.body.order_id;
  }

  // Filter by discount amount range
  if (props.body.min_discount_amount !== undefined) {
    if (!whereCondition.discount_amount) {
      whereCondition.discount_amount = {};
    }
    if (typeof whereCondition.discount_amount === "object") {
      (whereCondition.discount_amount as Record<string, unknown>).gte =
        props.body.min_discount_amount;
    }
  }

  if (props.body.max_discount_amount !== undefined) {
    if (!whereCondition.discount_amount) {
      whereCondition.discount_amount = {};
    }
    if (typeof whereCondition.discount_amount === "object") {
      (whereCondition.discount_amount as Record<string, unknown>).lte =
        props.body.max_discount_amount;
    }
  }

  // Filter by validity status
  if (props.body.is_valid !== undefined) {
    whereCondition.is_valid = props.body.is_valid;
  }

  // Filter by applied_at date range
  if (props.body.min_applied_at) {
    if (!whereCondition.applied_at) {
      whereCondition.applied_at = {};
    }
    if (typeof whereCondition.applied_at === "object") {
      (whereCondition.applied_at as Record<string, unknown>).gte =
        props.body.min_applied_at;
    }
  }

  if (props.body.max_applied_at) {
    if (!whereCondition.applied_at) {
      whereCondition.applied_at = {};
    }
    if (typeof whereCondition.applied_at === "object") {
      (whereCondition.applied_at as Record<string, unknown>).lte =
        props.body.max_applied_at;
    }
  }

  // Set default sort order (most recent first)
  const orderBy = props.body.sort
    ? {
        [props.body.sort.split(":")[0]]: props.body.sort.split(":")[1] as
          | "asc"
          | "desc",
      }
    : { applied_at: "desc" };

  // Execute concurrent queries for data count and paginated results
  const [redemptions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coupon_redemptions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy:
        orderBy as Prisma.shopping_mall_coupon_redemptionsOrderByWithRelationInput,
    }),
    MyGlobal.prisma.shopping_mall_coupon_redemptions.count({
      where: whereCondition,
    }),
  ]);

  // Map results to match ISummary interface (empty object as defined in DTO)
  const data = redemptions.map(() => ({}));

  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data,
  };
}
