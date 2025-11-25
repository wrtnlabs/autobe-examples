import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMvShoppingMallDailySale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMvShoppingMallDailySale";
import { IPageIShoppingMallMvShoppingMallDailySale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMvShoppingMallDailySale";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallMvShoppingMallDailySales(props: {
  body: IShoppingMallMvShoppingMallDailySale.IRequest;
}): Promise<IPageIShoppingMallMvShoppingMallDailySale.ISummary> {
  const { sales_date_from, sales_date_to, page, limit } = props.body;

  const skip = (page - 1) * limit;
  const take = limit;

  const where = {} as {
    sales_date?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  };

  if (sales_date_from !== undefined && sales_date_from !== null) {
    if (where.sales_date === undefined) {
      where.sales_date = {};
    }
    where.sales_date.gte = sales_date_from;
  }

  if (sales_date_to !== undefined && sales_date_to !== null) {
    if (where.sales_date === undefined) {
      where.sales_date = {};
    }
    where.sales_date.lte = sales_date_to;
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.mv_shopping_mall_daily_sales.findMany({
      where,
      orderBy: { sales_date: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.mv_shopping_mall_daily_sales.count({ where }),
  ]);

  return {
    data: records.map((record) => ({
      id: record.id,
      sales_date: toISOStringSafe(record.sales_date) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      total_orders: record.total_orders,
      total_sales_amount: record.total_sales_amount,
      total_items_sold: record.total_items_sold,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
