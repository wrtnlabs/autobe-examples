import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function getEcommerceMallAdminSellersSellerIdProfileSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerProfileSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceMallSellerProfileSnapshotTransformer.select(),
      },
    );
  if (snapshot.seller.id !== props.sellerId) {
    throw new HttpException(
      "Snapshot does not belong to the specified seller",
      404,
    );
  }
  return await EcommerceMallSellerProfileSnapshotTransformer.transform(
    snapshot,
  );
}
