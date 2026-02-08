import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallOrderItemSnapshots(props: {
  body: IShoppingMallOrderItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const dataRecords =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const totalRecords =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.count();
  const data: IShoppingMallOrderItemSnapshot.ISummary[] = dataRecords.map(
    (record) => ({
      id: record.id,
      order_id: record.shopping_mall_order_id, // renamed from order_id to shopping_mall_order_id
      product_name: record.product_name,
      price_cents: record.unit_price, // renamed from price_cents to unit_price
      quantity: record.quantity,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
  };
}
