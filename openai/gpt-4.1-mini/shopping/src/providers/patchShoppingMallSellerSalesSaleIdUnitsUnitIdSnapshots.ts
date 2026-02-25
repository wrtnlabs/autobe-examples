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

export async function patchShoppingMallSellerSalesSaleIdUnitsUnitIdSnapshots(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  unitId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleUnitSnapshot.IRequest;
}): Promise<IPageIShoppingMallSaleUnitSnapshot.ISummary> {
  // Validate existence of sale
  await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: props.saleId },
    select: { id: true },
  });
  // Validate existence of sale unit
  await MyGlobal.prisma.shopping_mall_sale_units.findUniqueOrThrow({
    where: { id: props.unitId },
    select: { id: true },
  });
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Compose where filter with search
  const where = {
    shopping_mall_sale_unit_id: props.unitId,
    deleted_at: null,
    ...(props.body.search
      ? {
          OR: [
            { sku_code: { contains: props.body.search } },
            { option_values: { contains: props.body.search } },
          ],
        }
      : {}),
  } satisfies Prisma.shopping_mall_sale_unit_snapshotsWhereInput;
  // Query paginated sale unit snapshots
  const data = await MyGlobal.prisma.shopping_mall_sale_unit_snapshots.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    },
  );
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_sale_unit_snapshots.count({
    where,
  });
  // Map DB records to DTO with safe ISO strings
  const resultData: IShoppingMallSaleUnitSnapshot.ISummary[] = data.map(
    (record) => ({
      id: record.id,
      skuCode: record.sku_code,
      optionValues: record.option_values,
      priceOverride: record.price_override ?? undefined,
      stockQuantity: record.stock_quantity,
      isActive: record.is_active,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    }),
  );
  return {
    data: resultData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
