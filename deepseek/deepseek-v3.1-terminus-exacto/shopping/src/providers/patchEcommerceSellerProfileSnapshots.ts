import { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceSellerProfileSnapshotAtSummaryTransformer } from "../transformers/EcommerceSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerProfileSnapshots(props: {
  seller: SellerPayload;
  body: IEcommerceSellerProfileSnapshot.IRequest;
}): Promise<IPageIEcommerceSellerProfileSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with seller ID filtering and date range
  const whereInput = {
    ecommerce_seller_id: props.seller.id,
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
  } satisfies Prisma.ecommerce_seller_profile_snapshotsWhereInput;
  // Use sequential execution instead of Promise.all for better error handling
  const data =
    await MyGlobal.prisma.ecommerce_seller_profile_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_seller_profile_snapshots.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceSellerProfileSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
