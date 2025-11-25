import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPoints";
import { IPageIShoppingMallPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPoints";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPoints(props: {
  admin: AdminPayload;
  body: IShoppingMallPoints.IRequest;
}): Promise<IPageIShoppingMallPoints.ISummary> {
  const {
    page,
    limit,
    search_text,
    min_balance,
    max_balance,
    start_date,
    end_date,
    sort_by,
    sort_order,
  } = props.body;

  type WhereType = NonNullable<
    Parameters<typeof MyGlobal.prisma.shopping_mall_points.findMany>[0]
  >["where"];

  const whereCondition: WhereType = {
    deleted_at: null,
    ...(min_balance !== undefined
      ? { balance: { gte: min_balance satisfies number as number } }
      : {}),
    ...(max_balance !== undefined
      ? { balance: { lte: max_balance satisfies number as number } }
      : {}),
    ...(start_date || end_date
      ? {
          created_at: {
            ...(start_date
              ? {
                  gte: toISOStringSafe(start_date) satisfies string &
                    tags.Format<"date-time">,
                }
              : {}),
            ...(end_date
              ? {
                  lte: toISOStringSafe(end_date) satisfies string &
                    tags.Format<"date-time">,
                }
              : {}),
          },
        }
      : {}),
  };

  const pageInt = page satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limitInt = limit satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_points.findMany({
      where: whereCondition,
      skip: (pageInt - 1) * limitInt,
      take: limitInt,
      orderBy: { [sort_by]: sort_order },
      select: {
        id: true,
        balance: true,
        shopping_mall_customer_id: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_points.count({ where: whereCondition }),
  ]);

  return {
    data: results.map((item) => ({
      id: item.id,
      balance: item.balance,
      shopping_mall_customer_id: item.shopping_mall_customer_id,
    })),
    pagination: {
      current: pageInt,
      limit: limitInt,
      records: total,
      pages: Math.ceil(total / limitInt),
    },
  };
}
