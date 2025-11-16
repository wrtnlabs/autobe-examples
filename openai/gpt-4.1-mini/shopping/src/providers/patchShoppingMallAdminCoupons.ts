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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCoupons(props: {
  admin: AdminPayload;
  body: IShoppingMallCoupon.IRequest;
}): Promise<IPageIShoppingMallCoupon.ISummary> {
  const page = props.body.page ?? 1;
  const rawLimit = props.body.limit ?? 20;
  const limit = rawLimit > 100 ? 100 : rawLimit;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    ...(props.body.search
      ? {
          OR: [
            { code: { contains: props.body.search } },
            { description: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  const sortableFields = new Set([
    "id",
    "status",
    "start_at",
    "end_at",
    "description",
    "discount_type",
    "discount_value",
    "minimum_order_amount",
    "maximum_discount_amount",
    "usage_limit",
    "created_at",
    "updated_at",
  ]);

  const orderByCondition =
    props.body.sort_by &&
    props.body.sort_order &&
    sortableFields.has(props.body.sort_by)
      ? {
          [props.body.sort_by]: props.body.sort_order as "asc" | "desc",
        }
      : { created_at: "desc" as "desc" };

  const [coupons, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coupons.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.shopping_mall_coupons.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: coupons.map((coupon) => {
      return {
        id: coupon.id,
        code: coupon.code,
        discount_rate: (coupon as any).discount_rate ?? 0,
        status: coupon.status as "active" | "expired" | "used" | "inactive",
        valid_from: toISOStringSafe(coupon.start_at),
        valid_until: toISOStringSafe(coupon.end_at),
        description: coupon.description === null ? "" : coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        minimum_order_amount:
          coupon.minimum_order_amount === null
            ? undefined
            : coupon.minimum_order_amount,
        maximum_discount_amount:
          coupon.maximum_discount_amount === null
            ? undefined
            : coupon.maximum_discount_amount,
        usage_limit:
          coupon.usage_limit === null ? undefined : coupon.usage_limit,
        created_at: toISOStringSafe(coupon.created_at),
        updated_at: toISOStringSafe(coupon.updated_at),
        deleted_at:
          coupon.deleted_at === null || coupon.deleted_at === undefined
            ? undefined
            : toISOStringSafe(coupon.deleted_at),
      };
    }),
  };
}
