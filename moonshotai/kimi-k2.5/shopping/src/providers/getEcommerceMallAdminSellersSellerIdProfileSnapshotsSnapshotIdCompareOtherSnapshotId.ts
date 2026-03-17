import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallSellerProfileSnapshotComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshotComparison";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallAdminSellersSellerIdProfileSnapshotsSnapshotIdCompareOtherSnapshotId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  otherSnapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerProfileSnapshotComparison> {
  // Verify seller exists
  await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
  });
  // Fetch both snapshots belonging to this seller
  const [snapshot, otherSnapshot] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        seller_id: props.sellerId,
      },
      ...EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findUniqueOrThrow({
      where: {
        id: props.otherSnapshotId,
        seller_id: props.sellerId,
      },
      ...EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
    }),
  ]);
  return {
    snapshot:
      await EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform(
        snapshot,
      ),
    otherSnapshot:
      await EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform(
        otherSnapshot,
      ),
  };
}
