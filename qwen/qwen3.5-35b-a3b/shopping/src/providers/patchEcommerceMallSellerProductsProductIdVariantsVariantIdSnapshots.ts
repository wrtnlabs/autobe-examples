import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  // Verify variant ownership through product ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found or access denied", 403);
  }
  // Verify variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (variant === null) {
    throw new HttpException("Variant not found or access denied", 403);
  }
  // Build query filters
  const filters: Prisma.ecommerce_mall_product_variant_snapshotsWhereInput = {
    product_id: props.productId,
    product_variant_id: props.variantId,
  };
  // Search filter on SKU code
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.trim().length > 0
  ) {
    filters.sku_code = { contains: props.body.search, mode: "insensitive" };
  }
  // Date range filters
  if (
    props.body.fromDate !== undefined &&
    props.body.fromDate !== null &&
    props.body.toDate !== undefined &&
    props.body.toDate !== null
  ) {
    const fromDate = new Date(props.body.fromDate);
    const toDate = new Date(props.body.toDate);
    filters.created_at = { gte: fromDate, lt: toDate };
  } else if (
    props.body.fromDate !== undefined &&
    props.body.fromDate !== null
  ) {
    const fromDate = new Date(props.body.fromDate);
    filters.created_at = { gte: fromDate };
  } else if (props.body.toDate !== undefined && props.body.toDate !== null) {
    const toDate = new Date(props.body.toDate);
    filters.created_at = { lt: toDate };
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Ensure page and limit are within valid ranges
  const validatedPage = page < 1 ? 1 : page;
  const validatedLimit = limit < 1 ? 1 : limit > 100 ? 100 : limit;
  // Query snapshots ordered by created_at descending (newest first)
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: filters,
      orderBy: { created_at: "desc" },
      skip,
      take: validatedLimit,
      ...EcommerceMallProductVariantSnapshotAtSummaryTransformer.select(),
    });
  // Count total records for pagination metadata
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
      where: filters,
    });
  // Transform snapshots to ISummary format
  const transformedData = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallProductVariantSnapshotAtSummaryTransformer.transform,
  );
  // Build paginated response
  const totalPages = total === 0 ? 0 : Math.ceil(total / validatedLimit);
  return {
    data: transformedData,
    pagination: {
      current: validatedPage,
      limit: validatedLimit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
