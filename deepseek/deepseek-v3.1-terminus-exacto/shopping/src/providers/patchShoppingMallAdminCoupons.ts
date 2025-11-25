import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { IPageIShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCoupon";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCoupons(props: {
  admin: AdminPayload;
  body: IShoppingMallCoupon.IRequest;
}): Promise<IPageIShoppingMallCoupon.ISummary> {
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;

  // Build WHERE conditions using object spread for cleaner conditional logic
  const whereConditions = {
    deleted_at: null,
    // Search filter (code or name)
    ...(props.body.search && {
      OR: [
        {
          code: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          name: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    }),
    // Discount type filter
    ...(props.body.discount_type && {
      discount_type: props.body.discount_type,
    }),
    // Active status filter
    ...(props.body.is_active !== undefined &&
      props.body.is_active !== null && {
        is_active: props.body.is_active,
      }),
    // Date range filters - use string comparison since dates are stored as strings
    ...((props.body.valid_from_min || props.body.valid_from_max) && {
      valid_from: {
        ...(props.body.valid_from_min && { gte: props.body.valid_from_min }),
        ...(props.body.valid_from_max && { lte: props.body.valid_from_max }),
      },
    }),
    ...((props.body.valid_until_min || props.body.valid_until_max) && {
      valid_until: {
        ...(props.body.valid_until_min && { gte: props.body.valid_until_min }),
        ...(props.body.valid_until_max && { lte: props.body.valid_until_max }),
      },
    }),
    // Channel filter
    ...(props.body.channel_id && {
      shopping_mall_channel_id: props.body.channel_id,
    }),
    // Creator filter
    ...(props.body.creator_id && {
      shopping_mall_administrator_id: props.body.creator_id,
    }),
    // Usage limit filters
    ...(props.body.usage_limit_per_customer !== undefined &&
      props.body.usage_limit_per_customer !== null && {
        usage_limit_per_customer: props.body.usage_limit_per_customer,
      }),
    ...(props.body.total_usage_limit !== undefined &&
      props.body.total_usage_limit !== null && {
        total_usage_limit: props.body.total_usage_limit,
      }),
    // Usage count range filters
    ...(((props.body.used_count_min !== undefined &&
      props.body.used_count_min !== null) ||
      (props.body.used_count_max !== undefined &&
        props.body.used_count_max !== null)) && {
      used_count: {
        ...(props.body.used_count_min !== undefined &&
          props.body.used_count_min !== null && {
            gte: props.body.used_count_min,
          }),
        ...(props.body.used_count_max !== undefined &&
          props.body.used_count_max !== null && {
            lte: props.body.used_count_max,
          }),
      },
    }),
  };

  // Build ORDER BY
  const orderBy: Record<string, "asc" | "desc"> = {};
  const orderField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order_direction ?? "desc";
  orderBy[orderField] = orderDirection;

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coupons.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_coupons.count({
      where: whereConditions,
    }),
  ]);

  // Map to response format with proper optional field handling
  const mappedData = data.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    minimum_order_amount: coupon.minimum_order_amount ?? undefined,
    valid_from: toISOStringSafe(coupon.valid_from),
    valid_until: toISOStringSafe(coupon.valid_until),
    is_active: coupon.is_active,
    used_count: coupon.used_count,
    created_at: toISOStringSafe(coupon.created_at),
    updated_at: toISOStringSafe(coupon.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: mappedData,
  };
}
