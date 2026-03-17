import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProfileSnapshotsSnapshotIdCompareOtherSnapshotId(props: {
  seller: SellerPayload;
  snapshotId: string;
  otherSnapshotId: string;
}): Promise<IEcommerceMallSellerProfileSnapshot.IComparison> {
  const reference =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findFirst({
      where: { id: props.snapshotId },
      select: {
        id: true,
        seller_id: true,
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
        created_at: true,
      },
    });
  if (reference === null) {
    throw new HttpException("Reference snapshot not found", 404);
  }
  const comparison =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findFirst({
      where: { id: props.otherSnapshotId },
      select: {
        id: true,
        seller_id: true,
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
        created_at: true,
      },
    });
  if (comparison === null) {
    throw new HttpException("Comparison snapshot not found", 404);
  }
  if (reference.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (comparison.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    referenceSnapshot: {
      id: reference.id,
      shopName: reference.shop_name,
      shopDescription: reference.shop_description,
      logoImageUrl: reference.logo_image_url,
      createdAt: reference.created_at.toISOString(),
    } satisfies IEcommerceMallSellerProfileSnapshot.ISummary,
    comparisonSnapshot: {
      id: comparison.id,
      shopName: comparison.shop_name,
      shopDescription: comparison.shop_description,
      logoImageUrl: comparison.logo_image_url,
      createdAt: comparison.created_at.toISOString(),
    } satisfies IEcommerceMallSellerProfileSnapshot.ISummary,
  };
}
