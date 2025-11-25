import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";
import { IPageIShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMileage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerMileages(props: {
  customer: CustomerPayload;
  body: IShoppingMallMileage.IRequest;
}): Promise<IPageIShoppingMallMileage.ISummary> {
  const {
    shopping_mall_customer_id,
    points_min,
    points_max,
    expired,
    active_only,
    page = 1,
    limit = 100,
    sort_by = "created_at",
    sort_order = "desc",
  } = props.body;

  const customerId = props.customer.id;

  const pointsFilter = {
    ...(typeof points_min === "number" ? { gte: points_min } : {}),
    ...(typeof points_max === "number" ? { lte: points_max } : {}),
  };

  const nowIsoString = toISOStringSafe(new Date());

  const whereBase = {
    shopping_mall_customer_id: shopping_mall_customer_id ?? customerId,
    deleted_at: active_only ? null : undefined,
  } as const;

  const expiredFilter =
    expired === true
      ? {
          expiration_date: {
            lt: nowIsoString as string & tags.Format<"date-time">,
          },
        }
      : expired === false
        ? {
            OR: [
              { expiration_date: null },
              {
                expiration_date: {
                  gte: nowIsoString as string & tags.Format<"date-time">,
                },
              },
            ],
          }
        : {};

  const where = {
    ...whereBase,
    ...(Object.keys(pointsFilter).length > 0 ? { points: pointsFilter } : {}),
    ...expiredFilter,
  };

  const skip = (page - 1) * limit;

  const orderBy = {
    [sort_by]: sort_order,
  } as { [key: string]: "asc" | "desc" };

  const [mileages, count] = await Promise.all([
    MyGlobal.prisma.shopping_mall_mileages.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        points: true,
        shopping_mall_customer_id: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_mileages.count({ where }),
  ]);

  const safePage = page satisfies number as number;
  const safeLimit = limit satisfies number as number;

  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: count,
      pages: Math.ceil(count / limit),
    },
    data: mileages.map((mileage) => ({
      id: mileage.id,
      points: mileage.points,
      shopping_mall_customer_id: mileage.shopping_mall_customer_id,
    })),
  };
}
