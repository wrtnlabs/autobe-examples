import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponUsage";
import { IPageIShoppingMallCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCouponUsage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCouponUsages(props: {
  admin: AdminPayload;
  body: IShoppingMallCouponUsage.IRequest;
}): Promise<IPageIShoppingMallCouponUsage.ISummary> {
  const {
    coupon_id,
    customer_id,
    order_id,
    used_at_from,
    used_at_to,
    page,
    limit,
    sort_by,
    order_direction,
  } = props.body;

  const whereCondition = {
    ...(coupon_id !== undefined && { shopping_mall_coupon_id: coupon_id }),
    ...(customer_id !== undefined && {
      shopping_mall_customer_id: customer_id,
    }),
    order_id:
      order_id === undefined ? undefined : order_id === null ? null : order_id,
    ...(used_at_from !== undefined || used_at_to !== undefined
      ? {
          used_at: {
            ...(used_at_from !== undefined && used_at_from !== null
              ? { gte: used_at_from }
              : {}),
            ...(used_at_to !== undefined && used_at_to !== null
              ? { lte: used_at_to }
              : {}),
          },
        }
      : {}),
  };

  const pageNumber = page > 0 ? page : 1;
  const pageSize = limit > 0 ? limit : 20;
  const skip = (pageNumber - 1) * pageSize;

  const orderField = sort_by ?? "used_at";
  const orderDir = order_direction ?? "desc";

  const [records, totalCount] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coupon_usages.findMany({
      where: whereCondition,
      skip,
      take: pageSize,
      orderBy: { [orderField]: orderDir },
    }),
    MyGlobal.prisma.shopping_mall_coupon_usages.count({
      where: whereCondition,
    }),
  ]);

  const data = records.map((record) => ({
    id: record.id,
    shopping_mall_coupon_id: record.shopping_mall_coupon_id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    used_at: toISOStringSafe(record.used_at),
    order_id: record.order_id === null ? null : (record.order_id ?? undefined),
  }));

  return {
    data,
    pagination: {
      current: pageNumber satisfies number as number,
      limit: pageSize satisfies number as number,
      records: totalCount,
      pages: Math.ceil(totalCount / pageSize),
    },
  };
}
