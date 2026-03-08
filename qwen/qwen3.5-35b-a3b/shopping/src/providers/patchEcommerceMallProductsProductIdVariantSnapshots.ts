import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdVariantSnapshots(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  // Verify product exists
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  // Build where clause for filtering snapshots
  const whereInput: Prisma.ecommerce_mall_product_variant_snapshotsWhereInput =
    {
      product_id: props.productId,
    };
  // Apply date range filters
  const created_atFilter: {
    gte?: string;
    lte?: string;
    gt?: string;
  } = {};
  if (props.body.created_atGte) {
    created_atFilter.gte = props.body.created_atGte;
  }
  if (props.body.created_atLte) {
    created_atFilter.lte = props.body.created_atLte;
  }
  if (props.body.created_atGt) {
    created_atFilter.gt = props.body.created_atGt;
  }
  if (Object.keys(created_atFilter).length > 0) {
    whereInput.created_at = created_atFilter as any;
  }
  // Apply active status filter
  if (props.body.is_active !== undefined) {
    whereInput.is_active = props.body.is_active;
  }
  // Apply stock quantity filters
  const stockQuantityFilter: {
    gte?: number;
    lte?: number;
  } = {};
  if (props.body.stockQuantityGte !== undefined) {
    stockQuantityFilter.gte = props.body.stockQuantityGte;
  }
  if (props.body.stockQuantityLte !== undefined) {
    stockQuantityFilter.lte = props.body.stockQuantityLte;
  }
  if (Object.keys(stockQuantityFilter).length > 0) {
    whereInput.stock_quantity = stockQuantityFilter as any;
  }
  // Determine sort direction
  const sortDirection = props.body.sortDirection ?? "desc";
  const orderByInput =
    sortDirection === "asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Query snapshots with transformer select
  const data =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallProductVariantSnapshotAtSummaryTransformer.select(),
    });
  // Count total records
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
      where: whereInput,
    });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallProductVariantSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
