import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSku";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSku";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductSnapshotSkuAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotSkuAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorProductsProductIdSnapshotsSnapshotIdSkus(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotSku.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotSku.ISummary> {
  // Verify snapshot exists and belongs to the product
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_product_id: props.productId,
      },
      select: {
        id: true,
        base_price: true,
      },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base WHERE conditions
  const baseConditions: Prisma.shopping_mall_product_snapshot_skusesWhereInput =
    {
      shopping_mall_product_snapshot_id: props.snapshotId,
    };
  // Add SKU code filter (case-insensitive partial match)
  if (props.body.sku_code !== undefined) {
    baseConditions.sku_code = {
      contains: props.body.sku_code,
      mode: "insensitive",
    };
  }
  // Add stock availability filter
  if (props.body.in_stock !== undefined) {
    baseConditions.stock_quantity = props.body.in_stock ? { gt: 0 } : 0;
  }
  // Handle price range filters with COALESCE-like logic
  // When price is null, use parent snapshot's base_price
  const hasPriceFilter =
    props.body.min_price !== undefined || props.body.max_price !== undefined;
  let whereInput: Prisma.shopping_mall_product_snapshot_skusesWhereInput;
  if (hasPriceFilter) {
    const minPrice = props.body.min_price ?? null;
    const maxPrice = props.body.max_price ?? null;
    const orConditions: Prisma.shopping_mall_product_snapshot_skusesWhereInput[] =
      [];
    // Records with price set - compare against price directly
    const priceNotNullCondition: Prisma.shopping_mall_product_snapshot_skusesWhereInput =
      {
        ...baseConditions,
        price: { not: null },
      };
    const priceRange: Prisma.FloatNullableFilter<"shopping_mall_product_snapshot_skuses"> =
      {};
    if (minPrice !== null) {
      priceRange.gte = minPrice;
    }
    if (maxPrice !== null) {
      priceRange.lte = maxPrice;
    }
    if (Object.keys(priceRange).length > 0) {
      priceNotNullCondition.price = priceRange;
    }
    orConditions.push(priceNotNullCondition);
    // Records with null price - compare against base_price
    const priceNullCondition: Prisma.shopping_mall_product_snapshot_skusesWhereInput =
      {
        ...baseConditions,
        price: null,
      };
    const basePriceRange: Prisma.FloatFilter<"shopping_mall_product_snapshots"> =
      {};
    if (minPrice !== null) {
      basePriceRange.gte = minPrice;
    }
    if (maxPrice !== null) {
      basePriceRange.lte = maxPrice;
    }
    if (Object.keys(basePriceRange).length > 0) {
      priceNullCondition.snapshot = { base_price: basePriceRange };
    }
    orConditions.push(priceNullCondition);
    whereInput = { OR: orConditions };
  } else {
    whereInput = baseConditions;
  }
  // Query with pagination
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallProductSnapshotSkuAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductSnapshotSkuAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
