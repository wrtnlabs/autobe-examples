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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProfileSnapshots(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerProfileSnapshot.ISummary> {
  // Get seller's profile to find profile ID for filtering
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirst({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (!sellerProfile) {
    return {
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions for snapshots filtered by seller's profile
  const snapshotWhere = {
    ecommerce_mall_seller_profile_id: sellerProfile.id,
    ...(props.body.fromDate && {
      created_at: { gte: new Date(props.body.fromDate) },
    }),
    ...(props.body.toDate && {
      created_at: {
        ...(props.body.fromDate && { gte: new Date(props.body.fromDate) }),
        lte: new Date(props.body.toDate),
      },
    }),
  } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsWhereInput;
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findMany({
      where: snapshotWhere,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination metadata
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.count({
      where: snapshotWhere,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      snapshots,
      EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform,
    ),
  };
}
