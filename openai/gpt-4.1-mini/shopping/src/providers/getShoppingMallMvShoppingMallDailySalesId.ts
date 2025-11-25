import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMvShoppingMallDailySale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMvShoppingMallDailySale";

export async function getShoppingMallMvShoppingMallDailySalesId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallMvShoppingMallDailySale> {
  const record = await MyGlobal.prisma.mv_shopping_mall_daily_sales.findUnique({
    where: { id: props.id },
  });

  if (!record) {
    throw new HttpException("Daily sales summary record not found", 404);
  }

  return {
    id: record.id,
    sales_date: toISOStringSafe(record.sales_date),
    total_orders: record.total_orders,
    total_sales_amount: record.total_sales_amount,
    total_items_sold: record.total_items_sold,
  };
}
