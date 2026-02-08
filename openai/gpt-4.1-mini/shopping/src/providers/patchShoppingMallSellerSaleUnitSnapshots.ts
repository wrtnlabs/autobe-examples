import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSaleUnitSnapshots(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleUnitSnapshot.IRequest;
}): Promise<IPageIShoppingMallSaleUnitSnapshot.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_unit_snapshotsWhereInput = {
    deleted_at: null,
  };
  if ((props.body as any).isActive !== undefined) {
    where.is_active = (props.body as any).isActive;
  }
  if ((props.body as any).sku_code !== undefined) {
    where.sku_code = {
      contains: (props.body as any).sku_code,
      mode: "insensitive",
    };
  }
  // We unify created_at filter as DateTimeFilter object
  let createdFrom = (props.body as any).createdAtFrom;
  let createdTo = (props.body as any).createdAtTo;
  if (createdFrom !== undefined || createdTo !== undefined) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (createdFrom !== undefined) createdAtFilter.gte = createdFrom;
    if (createdTo !== undefined) createdAtFilter.lte = createdTo;
    where.created_at = createdAtFilter;
  }
  const total = await MyGlobal.prisma.shopping_mall_sale_unit_snapshots.count({
    where,
  });
  const records =
    await MyGlobal.prisma.shopping_mall_sale_unit_snapshots.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { sku_code: "asc" }],
      skip,
      take: limit,
    });
  const data = records.map((record) => ({
    id: record.id,
    shopping_mall_sale_unit_id: record.shopping_mall_sale_unit_id,
    shopping_mall_sale_snapshot_id: record.shopping_mall_sale_snapshot_id,
    sku_code: record.sku_code,
    option_values: record.option_values,
    price_override:
      record.price_override === null ? undefined : record.price_override,
    stock_quantity: record.stock_quantity,
    is_active: record.is_active,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null
        ? undefined
        : toISOStringSafe(record.deleted_at),
  }));
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
  return { data, pagination };
}
