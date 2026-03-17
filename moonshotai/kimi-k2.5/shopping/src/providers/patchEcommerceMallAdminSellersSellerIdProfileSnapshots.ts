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
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerProfileSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const createdAtFilter: Prisma.DateTimeFilter | undefined =
    props.body.created_at_min !== null || props.body.created_at_max !== null
      ? {
          ...(props.body.created_at_min !== null && {
            gte: new Date(props.body.created_at_min),
          }),
          ...(props.body.created_at_max !== null && {
            lte: new Date(props.body.created_at_max),
          }),
        }
      : undefined;
  const where: Prisma.ecommerce_mall_seller_profile_snapshotsWhereInput = {
    seller_id: props.sellerId,
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  };
  const orderBy: Prisma.ecommerce_mall_seller_profile_snapshotsOrderByWithRelationInput =
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
