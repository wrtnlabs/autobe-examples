import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { EcommerceMallSellerProfileSnapshotTransformer } from "../transformers/EcommerceMallSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSellerProfileSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerProfileSnapshot> {
  // Query snapshot using the transformer's select for exact field matching
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceMallSellerProfileSnapshotTransformer.select(),
      },
    );
  // Verify ownership - seller can only view their own snapshots
  if (snapshot.sellerProfile.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform to response DTO
  return await EcommerceMallSellerProfileSnapshotTransformer.transform(
    snapshot,
  );
}
