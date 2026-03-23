import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { EcommerceMallShopProfileAtSummaryTransformer } from "../transformers/EcommerceMallShopProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProfileSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  snapshotId: string;
}): Promise<IEcommerceMallShopProfile> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_shop_profile_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          ecommerce_mall_seller_id: true,
          seller: EcommerceMallSellerAtSummaryTransformer.select(),
          profile: EcommerceMallShopProfileAtSummaryTransformer.select(),
        },
      },
    );
  // Access control: sellers can only access their own snapshots; admins can access any
  const isOwner = snapshot.ecommerce_mall_seller_id === props.seller.id;
  const isAdmin = false;
  if (!isOwner && !isAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: snapshot.id,
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
    ecommerce_mall_seller_id: snapshot.ecommerce_mall_seller_id,
    ecommerce_mall_shop_profile_id: snapshot.profile.id,
    seller: await EcommerceMallSellerAtSummaryTransformer.transform(
      snapshot.seller,
    ),
    profile: await EcommerceMallShopProfileAtSummaryTransformer.transform(
      snapshot.profile,
    ),
  };
}
