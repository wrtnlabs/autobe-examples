import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { IPageIShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCoupon";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallPromotionsCoupons(props: {
  body: IShoppingMallCoupon.IRequest;
}): Promise<IPageIShoppingMallCoupon.ISummary> {
  const {
    search,
    discountType,
    minOrderValue,
    sortBy = "discount_amount",
    limit = 10,
    offset = 0,
  } = props.body;

  // Build dynamic where clause
  const where: Record<string, unknown> = {
    status: "active",
    deleted_at: null,
    usage_count: { lte: Prisma.sql`max_usage_count` },
  };

  // Add search filter if provided
  if (search) {
    where.code = { contains: search, mode: "insensitive" };
  }

  // Add discount type filter
  if (discountType === "fixed_amount") {
    where.discount_amount = { not: null };
    where.discount_percentage = null;
  } else if (discountType === "percentage") {
    where.discount_percentage = { not: null };
    where.discount_amount = null;
  }

  // Add minimum order value filter
  if (minOrderValue !== undefined) {
    where.min_order_value = { lte: minOrderValue };
  }

  // Build order by clause
  const orderBy: Record<string, "asc" | "desc"> = {};
  switch (sortBy) {
    case "discount_amount":
      orderBy.discount_amount = "desc";
      break;
    case "discount_percentage":
      orderBy.discount_percentage = "desc";
      break;
    case "valid_until":
      orderBy.valid_until = "asc";
      break;
    case "created_at":
      orderBy.created_at = "desc";
      break;
    default:
      orderBy.discount_amount = "desc";
  }

  // Execute query
  const [coupons, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coupons.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      select: {
        id: true,
        code: true,
        discount_amount: true,
        discount_percentage: true,
        min_order_value: true,
        valid_from: true,
        valid_until: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_coupons.count({ where }),
  ]);

  // Transform to response format - only include id and code as per ISummary
  const data = coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
  }));

  return {
    pagination: {
      current: Math.floor(offset / limit) + 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
