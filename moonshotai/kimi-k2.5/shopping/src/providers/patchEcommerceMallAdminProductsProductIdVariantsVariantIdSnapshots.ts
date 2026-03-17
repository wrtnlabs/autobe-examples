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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductVariantSnapshotTransformer } from "../transformers/EcommerceMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductsProductIdVariantsVariantIdSnapshots(props: {
  admin: AdminPayload;
  productId: string;
  variantId: string;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  // Verify variant exists
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: { id: props.variantId },
  });
  // Build date range filter
  const dateFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null
  ) {
    dateFilter.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    dateFilter.lte = new Date(props.body.createdAtTo);
  }
  const whereInput = {
    product_variant_id: props.variantId,
    ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter }),
  } satisfies Prisma.ecommerce_mall_product_variant_snapshotsWhereInput;
  // Handle pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...EcommerceMallProductVariantSnapshotTransformer.select(),
    });
  // Count total records
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
      where: whereInput,
    });
  // Transform to DTOs
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallProductVariantSnapshotTransformer.transform,
  );
  // Build pagination
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    data: data.map((item) => ({
      ...item,
      variantId: props.variantId,
      createdAt: toISOStringSafe(item.createdAt),
    })) as any,
    pagination,
  };
}
