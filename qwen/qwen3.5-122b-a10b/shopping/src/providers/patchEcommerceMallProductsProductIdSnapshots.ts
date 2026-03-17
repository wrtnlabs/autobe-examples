import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdSnapshots(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshot.ISummary> {
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 0;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = page * limit;
  // Validate product exists
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Build where clause for snapshots
  const whereInput = {
    ecommerce_mall_products_id: props.productId,
  } satisfies Prisma.ecommerce_mall_product_snapshotsWhereInput;
  // Build order by with direction (default: desc - newest first)
  const order = props.body.order === "asc" ? "asc" : "desc";
  const orderByInput = {
    created_at: order as "asc" | "desc",
  } satisfies Prisma.ecommerce_mall_product_snapshotsOrderByWithRelationInput;
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallProductSnapshotAtSummaryTransformer.select(),
    });
  // Count total snapshots
  const total = await MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const data = await Promise.all(
    snapshots.map((snapshot) =>
      EcommerceMallProductSnapshotAtSummaryTransformer.transform(snapshot),
    ),
  );
  // Calculate pagination metadata
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page + 1, // Convert to 1-indexed for API response
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceMallProductSnapshot.ISummary;
}
