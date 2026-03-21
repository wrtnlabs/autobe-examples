import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductSnapshotVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductSnapshotVariant.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshotVariant.ISummary> {
  // Step 1: Verify product exists and belongs to the seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // Step 2: Authorization - seller can only view their own product's snapshots
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify variant exists and belongs to the product
  // Note: product_snapshot_variants store snapshots of variants at specific points in time
  // Each product_snapshot captures ALL variants at that moment
  // We filter by variantId through the product_snapshot_variants table
  // Get pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build date range filter
  const createdAfter = props.body.created_after
    ? new Date(props.body.created_after)
    : undefined;
  const createdBefore = props.body.created_before
    ? new Date(props.body.created_before)
    : undefined;
  // Determine sort order
  const sortDescending = props.body.sort !== "created_at";
  // Step 4: Query variant snapshots filtered by the variant
  // Each row in product_snapshot_variants represents a variant state at a snapshot moment
  // Filter by ecommerce_mall_product_snapshot.ecommerce_mall_product_id = props.productId
  const whereClause = {
    productSnapshot: {
      ecommerce_mall_product_id: props.productId,
      ...(createdAfter !== undefined && { created_at: { gte: createdAfter } }),
      ...(createdBefore !== undefined && {
        created_at: { lte: createdBefore },
      }),
    },
  } satisfies Prisma.ecommerce_mall_product_snapshot_variantsWhereInput;
  // Query variant snapshots with transformer select
  const variantSnapshots =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_variants.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: sortDescending ? "desc" : "asc" },
      ...EcommerceMallProductSnapshotVariantAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_variants.count({
      where: whereClause,
    });
  // Transform results using transformer
  const transformedData = await ArrayUtil.asyncMap(
    variantSnapshots,
    EcommerceMallProductSnapshotVariantAtSummaryTransformer.transform,
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
