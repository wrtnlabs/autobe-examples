import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellersSellerIdProfileSnapshots(props: {
  admin: AdminPayload;
  sellerId: string;
  body: IEcommerceMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerProfileSnapshot.ISummary> {
  // Verify seller exists - will throw 404 if not found
  await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
  });
  // Build date range filter
  const createdAtFilter: Prisma.DateTimeFilter | undefined =
    props.body.createdAfter !== null || props.body.createdBefore !== null
      ? {
          ...(props.body.createdAfter !== null && {
            gte: new Date(props.body.createdAfter),
          }),
          ...(props.body.createdBefore !== null && {
            lte: new Date(props.body.createdBefore),
          }),
        }
      : undefined;
  // Build where clause
  const whereInput = {
    seller_id: props.sellerId,
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsWhereInput;
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query snapshots with pagination, ordered by newest first
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination metadata
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.count({
      where: whereInput,
    });
  // Transform database records to DTO format
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform,
  );
  // Calculate total pages
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
