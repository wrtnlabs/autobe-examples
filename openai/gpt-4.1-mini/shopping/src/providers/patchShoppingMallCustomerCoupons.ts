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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCoupons(props: {
  customer: CustomerPayload;
  body: IShoppingMallCoupon.IRequest;
}): Promise<IPageIShoppingMallCoupon.ISummary> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = "start_date",
    sortOrder = "desc",
    code,
    type,
    validFrom,
    validTo,
    isDeleted,
  } = props.body;

  const whereClause = {
    AND: [
      code ? { code: { contains: code } } : {},
      type ? { type } : {},
      typeof isDeleted === "boolean"
        ? isDeleted
          ? { deleted_at: { not: null } }
          : { deleted_at: null }
        : { deleted_at: null },
      {
        OR: [
          {
            AND: [
              { start_date: { gte: validFrom ?? "0001-01-01T00:00:00.000Z" } },
              { end_date: { lte: validTo ?? "9999-12-31T23:59:59.999Z" } },
            ],
          },
          {
            AND: [
              { start_date: { lte: validFrom ?? "0001-01-01T00:00:00.000Z" } },
              { end_date: { gte: validTo ?? "9999-12-31T23:59:59.999Z" } },
            ],
          },
          {
            AND: [
              { start_date: { gte: validFrom ?? "0001-01-01T00:00:00.000Z" } },
              { end_date: { gte: validTo ?? "9999-12-31T23:59:59.999Z" } },
            ],
          },
        ],
      },
    ],
  };

  // Validate sortBy field:
  const sortableFields = new Set([
    "start_date",
    "end_date",
    "discount_value",
    "code",
    "type",
  ]);
  const orderByField = sortableFields.has(sortBy) ? sortBy : "start_date";

  // Validate sortOrder value:
  const orderDirection = sortOrder === "asc" ? "asc" : "desc";

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [coupons, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coupons.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { [orderByField]: orderDirection },
    }),
    MyGlobal.prisma.shopping_mall_coupons.count({ where: whereClause }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: pageSize satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: coupons.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      discount_value: c.discount_value,
      start_date: toISOStringSafe(c.start_date),
      end_date: toISOStringSafe(c.end_date),
    })),
  };
}
