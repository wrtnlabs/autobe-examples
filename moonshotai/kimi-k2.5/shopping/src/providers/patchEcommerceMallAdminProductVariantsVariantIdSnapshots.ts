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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductVariantSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductVariantsVariantIdSnapshots(props: {
  admin: AdminPayload;
  variantId: string;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  // Verify variant exists
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: { id: props.variantId },
  });
  // Build date filter conditions
  const dateFilter: Prisma.DateTimeFilter<"ecommerce_mall_product_variant_snapshots"> =
    {};
  if (props.body.createdAtFrom !== undefined) {
    dateFilter.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo !== undefined) {
    dateFilter.lte = new Date(props.body.createdAtTo);
  }
  const where = {
    product_variant_id: props.variantId,
    ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter }),
  } satisfies Prisma.ecommerce_mall_product_variant_snapshotsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Query snapshots with transformer select
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallProductVariantSnapshotAtSummaryTransformer.select(),
    });
  // Count total
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
      where,
    });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallProductVariantSnapshotAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
