import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceSellerProfileSnapshotTransformer } from "../transformers/EcommerceSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellersSellerIdSellerProfileSnapshotsSnapshotId(props: {
  sellerId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSellerProfileSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_seller_profile_snapshots.findUnique({
      where: {
        id: props.snapshotId,
        ecommerce_sellers_id: props.sellerId,
      },
      ...EcommerceSellerProfileSnapshotTransformer.select(),
    });
  if (!snapshot) {
    throw new HttpException("Profile snapshot not found", 404);
  }
  return await EcommerceSellerProfileSnapshotTransformer.transform(snapshot);
}
