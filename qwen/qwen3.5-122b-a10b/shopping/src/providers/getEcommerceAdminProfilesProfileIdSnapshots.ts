import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceSellerSnapshotAtSummaryTransformer } from "../transformers/EcommerceSellerSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export interface LocalAdminPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "admin";
}
export async function getEcommerceAdminProfilesProfileIdSnapshots(props: {
  admin: LocalAdminPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<IPageIEcommerceSellerSnapshot.ISummary> {
  // Verify profile exists
  await MyGlobal.prisma.ecommerce_sellers.findUniqueOrThrow({
    where: { id: props.profileId },
    select: { id: true },
  });
  // Pagination parameters with defaults
  const page: number = 1;
  const limit: number = 100;
  const skip: number = (page - 1) * limit;
  // Query snapshots ordered by created_at DESC (most recent first)
  const snapshots = await MyGlobal.prisma.ecommerce_seller_snapshots.findMany({
    where: {
      ecommerce_seller_id: props.profileId,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...EcommerceSellerSnapshotAtSummaryTransformer.select(),
  } satisfies Prisma.ecommerce_seller_snapshotsFindManyArgs);
  // Count total snapshots for this seller
  const total: number = await MyGlobal.prisma.ecommerce_seller_snapshots.count({
    where: {
      ecommerce_seller_id: props.profileId,
    },
  });
  // Transform snapshots and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      snapshots,
      EcommerceSellerSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceSellerSnapshot.ISummary;
}
