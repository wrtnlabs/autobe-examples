import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductsProductIdSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate product exists (admin can view any product's snapshots)
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Build date range filter
  const whereInput: Prisma.ecommerce_mall_product_snapshotsWhereInput = {
    ecommerce_mall_product_id: props.productId,
  };
  if (
    props.body.dateRangeStart !== undefined ||
    props.body.dateRangeEnd !== undefined
  ) {
    const dateFilter: Prisma.DateTimeFilter<"ecommerce_mall_product_snapshots"> =
      {};
    if (props.body.dateRangeStart !== undefined) {
      dateFilter.gte = new Date(props.body.dateRangeStart);
    }
    if (props.body.dateRangeEnd !== undefined) {
      dateFilter.lte = new Date(props.body.dateRangeEnd);
    }
    whereInput.created_at = dateFilter;
  }
  // Build orderBy (sortBy is fixed to 'created_at' per spec)
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_product_snapshotsOrderByWithRelationInput =
    {
      created_at: sortOrder,
    };
  // Query snapshots
  const data = await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallProductSnapshotAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallProductSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallProductSnapshot.ISummary;
}
