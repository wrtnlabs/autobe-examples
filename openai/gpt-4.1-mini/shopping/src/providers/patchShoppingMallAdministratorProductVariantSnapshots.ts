import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorProductVariantSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  // page, limit and shoppingMallProductVariantId are not properties of IRequest - using defaults without filter
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_product_variant_snapshotsWhereInput = {};
  const records =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where,
    });
  return {
    data: records.map((record) => ({
      id: record.id,
      sku_code: record.sku_code,
      price_override: record.price_override ?? null,
      option_values: record.option_values ?? null,
      stock_quantity: record.stock_quantity,
      created_at: toISOStringSafe(record.created_at),
      shoppingMallProductVariantId: record.shopping_mall_product_variant_id,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
