import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
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

export async function patchEcommerceMallSellerProductVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  // Verify variant exists and get product ownership info
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        product: {
          select: { seller_id: true },
        },
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  // Verify seller owns the product
  if (variant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause with date filters
  const whereInput = {
    product_variant_id: props.variantId,
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_product_variant_snapshotsWhereInput;
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...EcommerceMallProductVariantSnapshotAtSummaryTransformer.select(),
    });
  // Count total records
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
      where: whereInput,
    });
  // Transform results
  const transformedSnapshots = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallProductVariantSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedSnapshots,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
