import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerProfileSnapshotTransformer } from "../transformers/EcommerceMallSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminSellersSellerIdProfile(props: {
  admin: AdminPayload;
  sellerId: string;
}): Promise<IEcommerceMallSeller> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findFirst({
      where: { seller_id: props.sellerId, seller: { deleted_at: null } },
      orderBy: { created_at: "desc" },
      ...EcommerceMallSellerProfileSnapshotTransformer.select(),
    });
  if (snapshot === null) {
    throw new HttpException("Seller profile not found", 404);
  }
  const transformed =
    await EcommerceMallSellerProfileSnapshotTransformer.transform(snapshot);
  return {
    shopName: transformed.shopName,
    shopDescription: transformed.shopDescription,
    logoImageUrl: transformed.logoImageUrl,
    createdAt: transformed.createdAt,
  };
}
